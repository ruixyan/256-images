// lib/actions/images.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addImageFromFile(formData: FormData) {
  const supabase = await createClient();
  const file = formData.get("file") as File;
  const sourceName = formData.get("sourceName") as string;
  const note = formData.get("note") as string;

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const fileName = `${Date.now()}-${sanitizedName}`;

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(fileName, file);

  if (uploadError) throw new Error(uploadError.message);

  const { data: { publicUrl } } = supabase.storage
    .from("images")
    .getPublicUrl(fileName);

  const { error } = await supabase.from("images").insert({
    url: publicUrl,
    source_type: "upload",
    source_name: sourceName,
    note,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/images");
}

export async function addImageFromLink(formData: FormData) {
  const supabase = await createClient();
  const link = formData.get("link") as string;
  const sourceName = formData.get("sourceName") as string;
  const note = formData.get("note") as string;

  const { error } = await supabase.from("images").insert({
    url: link,
    source_type: "link",
    source_url: link,
    source_name: sourceName,
    note,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/images");
}

export async function deleteImage(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const url = formData.get("url") as string;
  const sourceType = formData.get("sourceType") as string;

  // If it was an uploaded file, also remove it from Storage
  if (sourceType === "upload") {
    const fileName = url.split("/").pop();
    if (fileName) {
      await supabase.storage.from("images").remove([fileName]);
    }
  }

  const { error } = await supabase.from("images").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/images");
}
export async function updateImage(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const sourceName = formData.get("sourceName") as string;
  const note = formData.get("note") as string;

  const { error } = await supabase
    .from("images")
    .update({ source_name: sourceName, note })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/images");
}

