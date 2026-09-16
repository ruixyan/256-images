// app/folders/[id]/page.tsx
import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ImageCard from "@/components/image-card";

export default function FolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="w-full px-6 py-10">
      <Suspense fallback={<p className="text-sm text-gray-400">Loading folder...</p>}>
        <FolderContent params={params} />
      </Suspense>
    </div>
  );
}

async function FolderContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: folder, error: folderError } = await supabase
    .from("folders")
    .select()
    .eq("id", id)
    .single();

  if (folderError || !folder) {
    return <p className="text-sm text-red-500">Folder not found.</p>;
  }

  const { data: imageLinks, error: imagesError } = await supabase
    .from("image_folders")
    .select("images(*, image_folders(folder_id))")
    .eq("folder_id", id);

  const { data: folders } = await supabase
    .from("folders")
    .select("id, name")
    .order("name");

  if (imagesError) {
    return <p className="text-sm text-red-500">Error loading images: {imagesError.message}</p>;
  }

  const images = (imageLinks?.map((link) => link.images).filter(Boolean) ?? []) as any[];

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg">{folder.name}</h1>
        <Link href="/folders" className="text-xs underline text-gray-400">
          back to folders
        </Link>
      </div>

      <p className="text-xs text-gray-400 mb-4">
        {images.length} {images.length === 1 ? "image" : "images"}
      </p>

      {images.length === 0 && (
        <p className="text-sm text-gray-400">No images in this folder.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-6">
        {images.map((img) => (
          <ImageCard key={img.id} img={img} folders={folders ?? []} />
        ))}
      </div>
    </>
  );
}