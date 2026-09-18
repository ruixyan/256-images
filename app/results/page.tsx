// app/results/page.tsx
import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { summarizeCollection } from "@/lib/quiz";
import { deleteQuizParticipant } from "@/lib/actions/quiz-results";
import { starPoints, seededRandom } from "@/lib/star-shape";

export default function ResultsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-400 px-6 py-10">Loading results...</p>}>
      <ResultsLoader />
    </Suspense>
  );
}

async function ResultsLoader() {
  const supabase = await createClient();

  const { data: participants, error: pErr } = await supabase
    .from("quiz_participants")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  if (pErr) {
    return <p className="text-sm text-red-500 px-6 py-10">Error loading participants: {pErr.message}</p>;
  }

  const { data: selections, error: sErr } = await supabase
    .from("quiz_selections")
    .select("participant_id, image_id, images(id, url, title, artist, date, color, medium, subject_matter)");

  if (sErr) {
    return <p className="text-sm text-red-500 px-6 py-10">Error loading selections: {sErr.message}</p>;
  }

  const allSelectedImages = (selections ?? []).map((s: any) => s.images).filter(Boolean);

  const imageCounts = new Map<string, { count: number; image: any }>();
  for (const img of allSelectedImages) {
    const entry = imageCounts.get(img.id) ?? { count: 0, image: img };
    entry.count += 1;
    imageCounts.set(img.id, entry);
  }
  const topImages = [...imageCounts.values()].sort((a, b) => b.count - a.count).slice(0, 12);

  const summary = summarizeCollection(allSelectedImages);
  const totalParticipants = participants?.length ?? 0;

  const picksByParticipant = new Map<string, Set<string>>();
  for (const s of selections ?? []) {
    if (!s.participant_id) continue;
    const set = picksByParticipant.get(s.participant_id) ?? new Set<string>();
    set.add(s.image_id);
    picksByParticipant.set(s.participant_id, set);
  }

  const rand = seededRandom(7);
  const rawPositions = (participants ?? []).map((p, i) => ({
    participant: p,
    x: 10 + rand() * 80, // percent
    y: 10 + rand() * 80, // percent
    seed: i * 13 + 5,
  }));

  // Push apart any two stars closer than MIN_DIST (in the same 0-100
  // percent space as x/y) — same repeated-pass technique used for the
  // node layout elsewhere in the app, run until nothing overlaps or a
  // pass cap is hit, whichever comes first.
  const MIN_DIST = 16;
  for (let pass = 0; pass < 200; pass++) {
    let moved = false;
    for (let i = 0; i < rawPositions.length; i++) {
      for (let j = i + 1; j < rawPositions.length; j++) {
        const a = rawPositions[i], b = rawPositions[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; dist = 0.01; }
        if (dist < MIN_DIST) {
          moved = true;
          const push = (MIN_DIST - dist) / 2;
          dx = (dx / dist) * push; dy = (dy / dist) * push;
          a.x += dx; a.y += dy;
          b.x -= dx; b.y -= dy;
        }
      }
    }
    if (!moved) break;
  }

  const starPositions = rawPositions.map((p) => ({
    ...p,
    x: Math.max(6, Math.min(94, p.x)),
    y: Math.max(6, Math.min(94, p.y)),
  }));
  const posById = new Map(starPositions.map((s) => [s.participant.id, s]));

  const ids = [...picksByParticipant.keys()];
  const rawConnections: { aId: string; bId: string; score: number }[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const setA = picksByParticipant.get(ids[i])!;
      const setB = picksByParticipant.get(ids[j])!;
      if (setA.size === 0 || setB.size === 0) continue;
      let shared = 0;
      for (const id of setA) if (setB.has(id)) shared++;
      if (shared === 0) continue;
      const score = shared / Math.min(setA.size, setB.size);
      rawConnections.push({ aId: ids[i], bId: ids[j], score });
    }
  }
  const maxScore = Math.max(0, ...rawConnections.map((c) => c.score));
  const connections = rawConnections
    .filter((c) => posById.has(c.aId) && posById.has(c.bId))
    .map((c) => ({
      a: posById.get(c.aId)!,
      b: posById.get(c.bId)!,
      strength: maxScore > 0 ? c.score / maxScore : 0,
    }));

  return (
    <div>
      <div className="h-screen flex flex-col px-6 py-10">
        <div className="flex items-center justify-between mb-1 shrink-0">
          <h1 className="text-lg">Results</h1>
          <Link href="/connections" className="text-xs underline text-green-500">
            view all connections
          </Link>
        </div>
        <p className="text-xs text-gray-400 mb-6 shrink-0">
          {totalParticipants} {totalParticipants === 1 ? "person has" : "people have"} taken the quiz
        </p>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
          <div className="border rounded p-4 overflow-y-auto">
            <h2 className="text-sm font-medium mb-3">Most popular categories</h2>
            <div className="space-y-6">
              {(["color", "medium", "subject", "artist"] as const).map((field) => (
                <div key={field}>
                  <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">
                    {field === "subject" ? "Subject matter" : field}
                  </h3>
                  {summary[field].length === 0 ? (
                    <p className="text-xs text-gray-300">No data</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {summary[field].slice(0, 6).map(({ value, count }) => (
                        <li key={value} className="text-xs">
                          <div className="flex justify-between mb-0.5">
                            <span className="capitalize">{value}</span>
                            <span className="text-gray-400">{count}</span>
                          </div>
                          <div className="h-1 bg-gray-100 rounded">
                            <div
                              className="h-1 bg-green-600 rounded"
                              style={{ width: `${(count / summary.total) * 100}%` }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto">
            <h2 className="text-sm font-medium mb-3">Most popular images</h2>
            {topImages.length === 0 ? (
              <p className="text-sm text-gray-400">No one has finished the quiz yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {topImages.map(({ image, count }) => (
                  <div key={image.id}>
                    <img src={image.url} alt={image.title ?? ""} className="w-full aspect-square object-cover border" />
                    <p className="text-xs font-medium mt-1 truncate">{image.title || "Untitled"}</p>
                    <p className="text-xs text-gray-400">
                      chosen by {count}/{totalParticipants}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="h-screen flex flex-col px-6 py-10 border-t">
        <h2 className="text-sm font-medium mb-4 shrink-0">Everyone who's played</h2>
        {starPositions.length === 0 ? (
          <p className="text-sm text-gray-400">No one yet.</p>
        ) : (
          <div className="relative flex-1 min-h-0 w-full">
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {connections.map((c, i) => (
                <line
                  key={i}
                  x1={c.a.x} y1={c.a.y} x2={c.b.x} y2={c.b.y}
                  stroke="#ffffff"
                  strokeOpacity={0.12 + 0.75 * c.strength}
                  strokeWidth={0.15 + 0.5 * c.strength}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>

            {starPositions.map(({ participant, x, y, seed }) => (
              <div key={participant.id} className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
                {/* Star icon — centered exactly on the (x%, y%) point, which is
                    also exactly where the connection lines above terminate. */}
                <Link
                  href={`/results/${participant.id}`}
                  className="absolute block hover:opacity-70 transition-opacity"
                  style={{ transform: "translate(-50%, -50%)" }}
                >
                  <svg viewBox="0 0 40 40" width={40} height={40}>
                    <polygon points={starPoints(20, 20, 18, 7.5, 6, seed)} fill="#ffffff" />
                  </svg>
                </Link>

                {/* Label + delete — positioned separately below the star,
                    so it doesn't shift the star's own anchor point. */}
                <div
                  className="absolute flex flex-col items-center w-20"
                  style={{ transform: "translate(-50%, 26px)" }}
                >
                  <p className="text-xs text-gray-300 text-center truncate w-full">{participant.name}</p>
                  <form action={deleteQuizParticipant.bind(null, participant.id)}>
                    <button type="submit" className="text-[10px] text-gray-500 hover:text-red-500 underline">
                      delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}