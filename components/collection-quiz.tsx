// components/collection-quiz.tsx
"use client";

import { useMemo, useState } from "react";
import { pickStartingNine, pickSimilarNine, summarizeCollection, emptyFilters, applyFilters } from "@/lib/quiz";
import type { CollectionFilters, FilterField } from "@/lib/quiz";
import { saveQuizSession } from "@/lib/quiz-graph";
import type { StoredQuizRound } from "@/lib/quiz-graph";
import { createFolderWithImages } from "@/lib/actions/folders";
import CollectionBreakdown from "@/components/collection-breakdown";
import QuizPathPreview from "@/components/quiz-path-preview";
import type { ImageInput } from "@/lib/graph-layout";

type QuizImage = ImageInput & {
  id: string;
  url: string;
  title: string | null;
  artist?: string | null;
  date?: string | null;
};

type Phase = "intro" | "playing" | "finished";

export default function CollectionQuiz({ images }: { images: QuizImage[] }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const totalImages = images.length;

  const initial = useMemo(() => {
    const round = pickStartingNine(images, 9) as QuizImage[];
    const roundIds = new Set(round.map((i) => i.id));
    const pool = images.filter((i) => !roundIds.has(i.id));
    return { round, pool };
  }, [images]);

  const [pool, setPool] = useState<QuizImage[]>(initial.pool);
  const [currentRound, setCurrentRound] = useState<QuizImage[]>(initial.round);
  const [collection, setCollection] = useState<QuizImage[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [roundNumber, setRoundNumber] = useState(1);
  const [history, setHistory] = useState<StoredQuizRound[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filters, setFilters] = useState<CollectionFilters>(emptyFilters());

  const hovered = currentRound.find((img) => img.id === hoveredId) ?? null;

  // How many of the total images have been shown so far, across every
  // completed round plus the round currently on screen.
  const seenCount = Math.min(
    totalImages,
    totalImages - pool.length
  );
  const progressPct = totalImages > 0 ? Math.round((seenCount / totalImages) * 100) : 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleContinue() {
    const chosen = currentRound.filter((img) => selected.has(img.id));
    const newCollection = [...collection, ...chosen];

    if (pool.length === 0) {
      const finalHistory: StoredQuizRound[] = [
        ...history,
        {
          round: roundNumber,
          images: currentRound.map((i) => ({
            id: i.id,
            url: i.url,
            title: i.title,
            artist: i.artist ?? null,
            date: i.date ?? null,
            color: i.color ?? null,
            medium: i.medium ?? null,
            subject_matter: i.subject_matter ?? null,
          })),
          chosenIds: chosen.map((i) => i.id),
          basisIds: [],
        },
      ];
      setHistory(finalHistory);
      saveQuizSession({ rounds: finalHistory });
      setCollection(newCollection);
      setCurrentRound([]);
      setPhase("finished");
      return;
    }

    const basis = chosen.length > 0 ? chosen : newCollection.length > 0 ? newCollection : currentRound;

    const nextCount = Math.min(9, pool.length);
    const nextRound = pickSimilarNine(pool, basis, nextCount) as QuizImage[];
    const nextIds = new Set(nextRound.map((i) => i.id));
    const nextPool = pool.filter((i) => !nextIds.has(i.id));

    const updatedHistory: StoredQuizRound[] = [
      ...history,
      {
        round: roundNumber,
        images: currentRound.map((i) => ({
          id: i.id,
          url: i.url,
          title: i.title,
          artist: i.artist ?? null,
          date: i.date ?? null,
          color: i.color ?? null,
          medium: i.medium ?? null,
          subject_matter: i.subject_matter ?? null,
        })),
        chosenIds: chosen.map((i) => i.id),
        basisIds: basis.map((i) => i.id),
      },
    ];
    setHistory(updatedHistory);
    saveQuizSession({ rounds: updatedHistory });

    setCollection(newCollection);
    setPool(nextPool);
    setCurrentRound(nextRound);
    setSelected(new Set());
    setHoveredId(null);
    setRoundNumber((n) => n + 1);

    if (nextRound.length === 0) {
      setPhase("finished");
    }
  }

  async function handleSave(formData: FormData) {
    setSaving(true);
    const name = (formData.get("name") as string) || "My collection";
    const fd = new FormData();
    fd.set("name", name);
    collection.forEach((img) => fd.append("imageIds", img.id));
    await createFolderWithImages(fd);
    setSaving(false);
    setSaved(true);
  }

  function toggleFilter(field: FilterField, value: string) {
    setFilters((prev) => {
      const next: CollectionFilters = {
        color: new Set(prev.color),
        medium: new Set(prev.medium),
        subject: new Set(prev.subject),
        artist: new Set(prev.artist),
      };
      const set = next[field];
      set.has(value) ? set.delete(value) : set.add(value);
      return next;
    });
  }

  function clearFilters() {
    setFilters(emptyFilters());
  }

  // ---------- intro ----------
  if (phase === "intro") {
    return (
      <div className="fixed inset-0 flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl mb-4">Build your collection</h1>
          <p className="text-sm text-gray-500 mb-2">
            You'll see 9 images at a time. Choose as many as you like — anything
            you don't pick won't come back around.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Each new set is chosen based on what you kept, so the collection
            narrows in on your taste as you go. It ends once the images run out.
          </p>
          <button
            onClick={() => setPhase("playing")}
            className="border px-6 py-2 text-sm hover:bg-gray-50"
          >
            Start
          </button>
        </div>
      </div>
    );
  }

  // ---------- finished ----------
  if (phase === "finished") {
    const summary = summarizeCollection(collection);
    const visibleCollection = applyFilters(collection, filters);

    return (
      <div className="w-full px-6 py-10">
        <h1 className="text-lg mb-2">Your collection</h1>
        <p className="text-xs text-gray-400 mb-6">
          {collection.length} image{collection.length === 1 ? "" : "s"} chosen
        </p>

        <CollectionBreakdown
          summary={summary}
          filters={filters}
          onToggle={toggleFilter}
          onClear={clearFilters}
          filteredCount={visibleCollection.length}
        />

        {collection.length > 0 && !saved && (
          <form action={handleSave} className="flex gap-2 mb-6">
            <input
              type="text"
              name="name"
              placeholder="Folder name"
              defaultValue="My collection"
              className="border-b text-sm py-1 focus:outline-none"
            />
            <button type="submit" disabled={saving} className="text-sm border px-3 py-1 hover:bg-gray-50">
              {saving ? "Saving..." : "Save as folder"}
            </button>
          </form>
        )}
        {saved && <p className="text-xs text-gray-400 mb-6">Saved as a folder.</p>}

        {collection.length === 0 ? (
          <p className="text-sm text-gray-400">You didn't keep any images this time.</p>
        ) : visibleCollection.length === 0 ? (
          <p className="text-sm text-gray-400">No images match the current filters.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
            {visibleCollection.map((img) => (
              <div key={img.id}>
                <img src={img.url} alt={img.title ?? ""} className="w-full h-auto" />
                <p className="text-xs text-gray-500 mt-1">{img.title ?? "Untitled"}</p>
              </div>
            ))}
          </div>
        )}

        <QuizPathPreview />
      </div>
    );
  }

  // ---------- playing ----------
  const metaLine2 = [hovered?.artist, hovered?.date].filter(Boolean).join(", ");
  const metaLine3 = [hovered?.medium, hovered?.color, hovered?.subject_matter]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="fixed inset-0 flex">
      <div className="w-1/3 border-r flex flex-col p-8 overflow-y-auto">
        <div>
          <h1 className="text-2xl mb-4">Round {roundNumber}</h1>
          <p className="text-sm text-gray-500 mb-6">
            Choose any images you'd like to keep. Whatever you don't pick this round won't come back —
            the next round is built from what you choose now.
          </p>

          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>{seenCount} of {totalImages} seen</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-gray-400">{selected.size} selected this round</p>
          <p className="text-xs text-gray-400">{collection.length} kept so far</p>
          <p className="text-xs text-gray-400">{pool.length} remaining after this round</p>
        </div>

        {hovered && (
          <div className="mt-6 pt-6 border-t">
            <img
              src={hovered.url}
              alt={hovered.title ?? ""}
              className="w-full max-h-56 object-contain mb-3 border border-gray-700"
            />
            <p className="text-sm font-medium leading-snug">{hovered.title || "Untitled"}</p>
            {metaLine2 && <p className="text-xs text-gray-500 leading-snug">{metaLine2}</p>}
            {metaLine3 && <p className="text-xs text-gray-400 leading-snug">{metaLine3}</p>}
          </div>
        )}

        <button
          onClick={handleContinue}
          className="border px-4 py-2 text-sm hover:bg-gray-50 self-start mt-auto pt-6"
        >
          Continue
        </button>
      </div>

      <div className="w-2/3 h-full grid grid-cols-3 grid-rows-3 gap-2 p-2">
        {currentRound.map((img) => (
          <button
            type="button"
            key={img.id}
            onClick={() => toggle(img.id)}
            onMouseEnter={() => setHoveredId(img.id)}
            onMouseLeave={() => setHoveredId((cur) => (cur === img.id ? null : cur))}
            className={`relative overflow-hidden text-left border-2 ${
              selected.has(img.id) ? "border-green-600" : "border-transparent"
            }`}
          >
            <img
              src={img.url}
              alt={img.title ?? ""}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
        {Array.from({ length: Math.max(0, 9 - currentRound.length) }).map((_, i) => (
          <div key={`pad-${i}`} className="bg-gray-50" />
        ))}
      </div>

      <QuizPathPreview />
    </div>
  );
}