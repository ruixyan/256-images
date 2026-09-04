// app/images/page.tsx
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import ImageUploadForm from "@/components/image-upload-form";
import ImageGridClient from "@/components/image-grid-client";
import Link from "next/link";

export default function ImagesPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg">Images</h1>
        <Link href="/folders" className="text-xs underline text-gray-400">
          view folders
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
  const { data: images, error } = await supabase
    .from("images")
    .select()
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="text-sm text-red-500">Error loading images: {error.message}</p>;
  }

  return <ImageGridClient images={images ?? []} />;
}