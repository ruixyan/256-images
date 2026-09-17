// app/results/[id]/page.tsx
import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default function ParticipantResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="w-full px-6 py-10">
      <Suspense fallback={<p className="text-sm text-gray-400">Loading...</p>}>
        <ParticipantLoader params={params} />
      </Suspense>
    </div>
  );
}

async function ParticipantLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: participant, error: pErr } = await supabase
    .from("quiz_participants")
    .select("id, name, created_at")
    .eq("id", id)
    .single();

  if (pErr || !participant) {
    return <p className="text-sm text-red-500">Participant not found.</p>;
  }

  const { data: mySelections, error: mErr } = await supabase
    .from("quiz_selections")
    .select("images(id, url, title, artist, date, color, medium, subject_matter)")
    .eq("participant_id", id);

  if (mErr) {
    return <p className="text-sm text-red-500">Error loading picks: {mErr.message}</p>;
  }

  const myImages = (mySelections ?? []).map((s: any) => s.images).filter(Boolean);

  const { count: totalParticipants } = await supabase
    .from("quiz_participants")
    .select("*", { count: "exact", head: true });

  const { data: allSelections } = await supabase
    .from("quiz_selections")
    .select("image_id");

  const globalCounts = new Map<string, number>();
  for (const s of allSelections ?? []) {
    globalCounts.set(s.image_id, (globalCounts.get(s.image_id) ?? 0) + 1);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-lg">{participant.name}'s collection</h1>
        <Link href="/results" className="text-xs underline text-gray-400">
          all results
        </Link>
      </div>
      <p className="text-xs text-gray-400 mb-8">{myImages.length} images chosen</p>

      {myImages.length === 0 ? (
        <p className="text-sm text-gray-400">Didn't keep any images this round.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
          {myImages.map((img) => {
            const count = globalCounts.get(img.id) ?? 0;
            const isPopular = count >= (totalParticipants ?? 1) * 0.5;
            return (
              <div key={img.id}>
                <img src={img.url} alt={img.title ?? ""} className="w-full h-auto border" />
                <p className="text-xs font-medium mt-1 truncate">{img.title || "Untitled"}</p>
                <p className={`text-xs ${isPopular ? "text-green-700" : "text-gray-400"}`}>
                  also chosen by {count}/{totalParticipants} people
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}