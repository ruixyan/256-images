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
    .select("image_id, images(id, url, title, artist, date, color, medium, subject_matter)");

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

  // Scattered, deterministic star placement for participants — same seed
  // per index every render, so positions don't jump around on refresh.
  const rand = seededRandom(7);
  const rows = Math.max(1, Math.ceil((totalParticipants || 1) / 6));
  const fieldHeight = rows * 150 + 60;
  const starPositions = (participants ?? []).map((p, i) => ({
    participant: p,
    x: 6 + rand() * 88, // percent
    y: 6 + rand() * 88, // percent within the field
    seed: i * 13 + 5,
  }));

  return (
    <div>
      {/* Fits within one viewport — header + categories + top images */}
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

      {/* Below the fold — scroll down to see who's played */}
      <div className="px-6 py-10 border-t">
        <h2 className="text-sm font-medium mb-4">Everyone who's played</h2>
        {starPositions.length === 0 ? (
          <p className="text-sm text-gray-400">No one yet.</p>
        ) : (
          <div className="relative w-full" style={{ height: fieldHeight }}>
            {starPositions.map(({ participant, x, y, seed }) => (
              <div
                key={participant.id}
                className="absolute flex flex-col items-center w-20 -translate-x-1/2"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <Link href={`/results/${participant.id}`}>
                  <svg viewBox="0 0 40 40" width={40} height={40} className="hover:opacity-70 transition-opacity">
                    <polygon points={starPoints(20, 20, 18, 7.5, 6, seed)} fill="#ffffff" />
                  </svg>
                </Link>
                <p className="text-xs text-gray-300 mt-1 text-center truncate w-full">{participant.name}</p>
                <form action={deleteQuizParticipant.bind(null, participant.id)}>
                  <button type="submit" className="text-[10px] text-gray-500 hover:text-red-500 underline">
                    delete
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}