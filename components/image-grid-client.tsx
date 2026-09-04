// components/image-grid-client.tsx
"use client";

import { useState } from "react";
import ImageCard from "@/components/image-card";
import { createFolderWithImages } from "@/lib/actions/folders";

type ImageRecord = {
  id: string;
  url: string;
  source_type: string;
  source_url: string | null;
  source_name: string | null;
  note: string | null;
};

export default function ImageGridClient({ images }: { images: ImageRecord[] }) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function exitSelecting() {
    setSelecting(false);
    setSelected(new Set());
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 text-xs">
        <p className="text-gray-400">
          {images.length} {images.length === 1 ? "image" : "images"}
        </p>
        {selecting ? (
          <>
            <span className="text-gray-400">{selected.size} selected</span>
            <button onClick={exitSelecting} className="underline text-gray-400">
              cancel
            </button>
          </>
        ) : (
          <button onClick={() => setSelecting(true)} className="underline text-gray-400">
            select
          </button>
        )}
      </div>

      {selecting && selected.size > 0 && (
        <form
          action={async (formData) => {
            await createFolderWithImages(formData);
            exitSelecting();
          }}
          className="flex gap-2 mb-4"
        >
          {[...selected].map((id) => (
            <input key={id} type="hidden" name="imageIds" value={id} />
          ))}
          <input
            type="text"
            name="name"
            placeholder="Folder name"
            required
            className="border-b text-sm py-1 focus:outline-none"
          />
          <button type="submit" className="text-sm border px-3 py-1 hover:bg-gray-50">
            Create folder
          </button>
        </form>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
        {images.map((img) => (
          <div key={img.id} className="relative">
            {selecting && (
              <input
                type="checkbox"
                checked={selected.has(img.id)}
                onChange={() => toggleSelect(img.id)}
                className="absolute top-1 left-1 z-10 w-4 h-4"
              />
            )}
            <ImageCard img={img} />
          </div>
        ))}
      </div>
    </div>
  );
}