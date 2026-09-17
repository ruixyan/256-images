// lib/actions/quiz-results.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveQuizResult(name: string, imageIds: string[]): Promise<string> {
  const supabase = await createClient();

  const { data: participant, error: pErr } = await supabase
    .from("quiz_participants")
    .insert({ name: name.trim() || "Anonymous" })
    .select("id")
    .single();

  if (pErr) throw new Error(pErr.message);

  if (imageIds.length > 0) {
    const { error: sErr } = await supabase
      .from("quiz_selections")
      .insert(imageIds.map((imageId) => ({ participant_id: participant.id, image_id: imageId })));
    if (sErr) throw new Error(sErr.message);
  }

  revalidatePath("/results");
  return participant.id as string;
}

export async function deleteQuizParticipant(participantId: string) {
    const supabase = await createClient();
    const { error } = await supabase
      .from("quiz_participants")
      .delete()
      .eq("id", participantId);
    if (error) throw new Error(error.message);
    revalidatePath("/results");
  }