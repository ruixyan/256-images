// app/results/page.tsx
import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { summarizeCollection } from "@/lib/quiz";
import { deleteQuizParticipant } from "@/lib/actions/quiz-results";

export default function ResultsPage() {
  return (
    <div className="w-full px-6 py-10">
      <Suspense fallback={<p className="text-sm text-gray-400">Loading results...</p>}>
        <ResultsLoader />
      </Suspense>
    </div>
  );
}

async function ResultsLoader() {
  const supabase = await createClient();

  const { data: participants, error: pErr } = await supabase
    .from("quiz_participants")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  if (pErr) {
    return <p className="text-sm text-red-500">Error loading participants: {pErr.message}</p>;
  }

  const { data: selections, error: sErr } = await supabase
    .from("quiz_selections")
    .select("image_id, images(id, url, title, artist, date, color, medium, subject_matter)");

  if (sErr) {
    return <p className="text-sm text-red-500">Error loading selections: {sErr.message}</p>;
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



  return (
    <div>
      <h1 className="text-lg mb-2">Results</h1>
      <p className="text-xs text-gray-400 mb-8">
        {totalParticipants} {totalParticipants === 1 ? "person has" : "people have"} taken the quiz
      </p>

      <h2 className="text-sm font-medium mb-3">Most popular images</h2>
      {topImages.length === 0 ? (
        <p className="text-sm text-gray-400 mb-10">No one has finished the quiz yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-10">
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

      <h2 className="text-sm font-medium mb-3">Most popular categories</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10 border rounded p-4">
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
      <h2 className="text-sm font-medium mb-3">Everyone who's played</h2>
      {participants?.length === 0 ? (
        <p className="text-sm text-gray-400">No one yet.</p>
      ) : (
        <ul className="space-y-1">
          {participants?.map((p) => (
            <li key={p.id} className="flex items-center gap-3">
              <Link href={`/results/${p.id}`} className="text-sm underline hover:text-green-700">
                {p.name}
              </Link>
              <form action={deleteQuizParticipant.bind(null, p.id)}>
                <button type="submit" className="text-xs text-gray-400 hover:text-red-500 underline">
                  delete
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}