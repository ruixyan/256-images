// app/images/page.tsx
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import ImageUploadForm from "@/components/image-upload-form";
import ImageGridClient from "@/components/image-grid-client";
import Link from "next/link";

export default function ImagesPage() {
  return (
    <div className="w-full px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg">Images — art</h1>
        <Link href="/folders" className="text-xs underline text-gray-400">
          view all folders
        </Link>
      </div>

      <ImageUploadForm />

      <Suspense fallback={<p className="text-sm text-gray-400">Loading images...</p>}>
        <ImageGrid />
      </Suspense>
    </div>
  );
}

async function ImageGrid() {
  const supabase = await createClient();

  const { data: artFolder } = await supabase
    .from("folders")
    .select("id")
    .ilike("name", "art")
    .maybeSingle();

  const { data: folders } = await supabase
    .from("folders")
    .select("id, name")
    .order("name");

  if (!artFolder) {
    return (
      <p className="text-sm text-gray-400">
        No "art" folder found yet — create one (select some images → name it "art") and it'll become the default view here.
      </p>
    );
  }

  const { data: imageLinks, error } = await supabase
    .from("image_folders")
    .select("images(*, image_folders(folder_id))")
    .eq("folder_id", artFolder.id);

  if (error) {
    return <p className="text-sm text-red-500">Error loading images: {error.message}</p>;
  }

  const images = (imageLinks?.map((l) => l.images).filter(Boolean) ?? []) as any[];
  images.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return <ImageGridClient images={images} folders={folders ?? []} />;
}