// app/folders/[id]/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ImageCard from "@/components/image-card";

export default async function FolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  const { data: images, error: imagesError } = await supabase
    .from("images")
    .select()
    .eq("folder_id", id)
    .order("created_at", { ascending: false });

  if (imagesError) {
    return <p className="text-sm text-red-500">Error loading images: {imagesError.message}</p>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg">{folder.name}</h1>
        <Link href="/folders" className="text-xs underline text-gray-400">
          back to folders
        </Link>
      </div>

      <p className="text-xs text-gray-400 mb-4">
        {images?.length ?? 0} {images?.length === 1 ? "image" : "images"}
      </p>

      {images?.length === 0 && (
        <p className="text-sm text-gray-400">No images in this folder.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
        {images?.map((img) => (
          <ImageCard key={img.id} img={img} />
        ))}
      </div>
    </div>
  );
}