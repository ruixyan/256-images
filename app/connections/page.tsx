import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import ConnectionsView from "@/components/connections-view";

export default function ConnectionsPage() {
  return (
    <div className="fixed inset-0">
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
            Loading connections...
          </div>
        }
      >
        <ConnectionsLoader />
      </Suspense>
    </div>
  );
}

async function ConnectionsLoader() {
  const supabase = await createClient();

  const { data: artFolder } = await supabase
    .from("folders")
    .select("id")
    .ilike("name", "art")
    .maybeSingle();

  if (!artFolder) {
    return (
      <div className="w-full h-full flex items-center justify-center px-6 text-center">
        <p className="text-sm text-gray-400">
          No "art" folder found yet — create one and this page will show its
          connections.
        </p>
      </div>
    );
  }

  const { data: imageLinks, error } = await supabase
    .from("image_folders")
    .select(
      "images(id, url, title, artist, date, color, medium, subject_matter)"
    )
    .eq("folder_id", artFolder.id);

  if (error) {
    return (
      <p className="text-sm text-red-500 px-6 py-4">
        Error loading images: {error.message}
      </p>
    );
  }

  const images =
    (imageLinks?.map((link) => link.images).filter(Boolean) ?? []) as any[];

  return <ConnectionsView allImages={images} />;
}
