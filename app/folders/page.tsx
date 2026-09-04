// app/folders/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function FoldersPage() {
  const supabase = await createClient();

  const { data: folders, error } = await supabase
    .from("folders")
    .select("id, name, images(count)")
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="text-sm text-red-500">Error loading folders: {error.message}</p>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg">Folders</h1>
        <Link href="/images" className="text-xs underline text-gray-400">
          back to images
        </Link>
      </div>

      {folders?.length === 0 && (
        <p className="text-sm text-gray-400">No folders yet.</p>
      )}

      <ul className="space-y-2">
        {folders?.map((folder) => (
          <li key={folder.id}>
            <Link
              href={`/folders/${folder.id}`}
              className="flex justify-between border-b py-2 text-sm hover:underline"
            >
              <span>{folder.name}</span>
              <span className="text-gray-400">
                {folder.images?.[0]?.count ?? 0} images
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}