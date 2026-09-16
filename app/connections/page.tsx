// app/connections/page.tsx
import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ConnectionsView from "@/components/connections-view";
import { buildGraph, layoutGraph } from "@/lib/graph-layout";

export default function ConnectionsPage() {
  return (
    <div className="fixed inset-0 flex flex-col">
      <div className="px-4 py-2 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-medium">Connections</h1>
          <Link href="/" className="text-xs underline text-gray-400">
            back to quiz
          </Link>
        </div>
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

  return (
    <ConnectionsView
      defaultNodes={layout.nodes}
      defaultEdges={edges}
      defaultWidth={layout.width}
      defaultHeight={layout.height}
    />
  );
}