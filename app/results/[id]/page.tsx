
import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ParticipantGraph from "@/components/participant-graph";

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

async function ParticipantLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
    .select(
      "image_id, images(id, url, title, artist, date, color, medium, subject_matter)"
    )
    .eq("participant_id", id);

  if (mErr) {
    return (
      <p className="text-sm text-red-500">
        Error loading picks: {mErr.message}
      </p>
    );
  }

  const myImages = (mySelections ?? [])
    .map((selection: any) => selection.images)
    .filter(Boolean);

  const selectedImageIds = (mySelections ?? [])
    .map((selection: any) => selection.image_id)
    .filter(Boolean);

  const { count: totalParticipants } = await supabase
    .from("quiz_participants")
    .select("*", { count: "exact", head: true });

  const { data: allSelections } = await supabase
    .from("quiz_selections")
    .select("image_id");

  const globalCounts = new Map<string, number>();

  for (const selection of allSelections ?? []) {
    globalCounts.set(
      selection.image_id,
      (globalCounts.get(selection.image_id) ?? 0) + 1
    );
  }

  return (
    <ParticipantGraph
      participantName={participant.name}
      myImages={myImages}
      selectedImageIds={selectedImageIds}
      globalCounts={Object.fromEntries(globalCounts)}
      totalParticipants={totalParticipants ?? 0}
    />
  );
}
