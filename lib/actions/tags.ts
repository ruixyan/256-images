// lib/actions/tags.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function setImageTags(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const raw = (formData.get("tags") as string) ?? "";

  const names = Array.from(
    new Set(
      raw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    )
  );

  const tagIds: string[] = [];
  for (const name of names) {
    const { data: existing } = await supabase
      .from("tags")
      .select("id")
      .eq("name", name)
      .maybeSingle();

    if (existing) {
      tagIds.push(existing.id);
    } else {
      const { data: created, error } = await supabase
        .from("tags")
        .insert({ name })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      tagIds.push(created.id);
    }
  }

  const { error: deleteError } = await supabase
    .from("image_tags")
    .delete()
    .eq("image_id", id);
  if (deleteError) throw new Error(deleteError.message);

  if (tagIds.length > 0) {
    const { error: insertError } = await supabase
      .from("image_tags")
      .insert(tagIds.map((tagId) => ({ image_id: id, tag_id: tagId })));
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath("/images");
  revalidatePath("/folders");
}