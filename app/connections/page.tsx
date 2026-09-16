// app/connections/page.tsx
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import ConnectionGraph from "@/components/connection-graph";
import PopularCombo from "@/components/popular-combo";
import { buildGraph, layoutGraph, getMostPopularCombo } from "@/lib/graph-layout";

export default function ConnectionsPage() {
  return (
    <div className="fixed inset-0 flex flex-col">
      <div className="px-4 py-2 border-b flex items-center justify-between shrink-0">
        <h1 className="text-sm font-medium">Connections — color, medium, subject</h1>
        <p className="text-xs text-gray-400">scroll to zoom · drag to pan</p>
      </div>
      <div className="flex-1 min-h-0">
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
              Loading connections...
            </div>
          }
        >
          <ConnectionsGraphLoader />
        </Suspense>
      </div>
    </div>
  );
}

async function ConnectionsGraphLoader() {
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
          No "art" folder found yet — create one and this page will show its connections.
        </p>
      </div>
    );
  }

  const { data: imageLinks, error } = await supabase
    .from("image_folders")
    .select("images(id, url, title, color, medium, subject_matter)")
    .eq("folder_id", artFolder.id);

  if (error) {
    return (
      <p className="text-sm text-red-500 px-6 py-4">
        Error loading images: {error.message}
      </p>
    );
  }

  const images = (imageLinks?.map((l) => l.images).filter(Boolean) ?? []) as any[];
  const { nodes, edges } = buildGraph(images);
  const layout = layoutGraph(nodes, edges);
  const popular = getMostPopularCombo(images, 9);

  return (
    <div className="h-full flex flex-col">
      <PopularCombo items={popular} />
      <div className="flex-1 min-h-0">
        <ConnectionGraph nodes={layout.nodes} edges={edges} width={layout.width} height={layout.height} />
      </div>
    </div>
  );
}