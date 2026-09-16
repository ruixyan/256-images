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

  const { error: linkError } = await supabase
    .from("image_folders")
    .insert(imageIds.map((imageId) => ({ image_id: imageId, folder_id: folder.id })));

  if (linkError) throw new Error(linkError.message);
  revalidatePath("/images");
  revalidatePath("/folders");
}