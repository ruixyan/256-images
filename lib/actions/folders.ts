// lib/actions/folders.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createFolderWithImages(formData: FormData) {
  const supabase = await createClient();
  const name = formData.get("name") as string;
  const imageIds = formData.getAll("imageIds") as string[];

  const { data: folder, error: folderError } = await supabase
    .from("folders")
    .insert({ name })
    .select()
    .single();

  if (folderError) throw new Error(folderError.message);

  const { error: updateError } = await supabase
    .from("images")
    .update({ folder_id: folder.id })
    .in("id", imageIds);

  if (updateError) throw new Error(updateError.message);
  revalidatePath("/images");
}