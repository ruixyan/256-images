// components/image-card.tsx
"use client";

import { useState } from "react";
import { deleteImage, updateImage } from "@/lib/actions/images";

type Image = {
  id: string;
  url: string;
  source_type: string;
  source_url: string | null;
  source_name: string | null;
  note: string | null;
};

export default function ImageCard({ img }: { img: Image }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form
        action={async (formData) => {
          await updateImage(formData);
          setEditing(false);
        }}
        className="space-y-1 border p-2"
      >
        <input type="hidden" name="id" value={img.id} />
        <img src={img.url} alt={img.source_name ?? ""} className="w-full h-auto" />
        <input
          type="text"
          name="sourceName"
          defaultValue={img.source_name ?? ""}
          placeholder="Source"
          className="w-full border-b py-1 text-xs focus:outline-none"
        />
        <textarea
          name="note"
          defaultValue={img.note ?? ""}
          placeholder="Notes"
          rows={2}
          className="w-full border-b py-1 text-xs resize-none focus:outline-none"
        />
        <div className="flex gap-3 text-xs">
          <button type="submit" className="underline">
            save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-gray-400 underline"
          >
            cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-1">
      <img
        src={img.url}
        alt={img.source_name ?? ""}
        className="w-full h-auto cursor-pointer"
        onClick={() => setEditing(true)}
      />
      <p className="text-xs text-gray-500">
        {img.source_name}
        {img.source_type === "link" && (
          <a href={img.source_url ?? "#"} target="_blank" className="underline ml-1">
            original
          </a>
        )}
      </p>
      {img.note && <p className="text-xs text-gray-400">{img.note}</p>}

      <form action={deleteImage}>
        <input type="hidden" name="id" value={img.id} />
        <input type="hidden" name="url" value={img.url} />
        <input type="hidden" name="sourceType" value={img.source_type} />
        <button type="submit" className="text-xs text-gray-400 hover:text-red-500 underline">
          delete
        </button>
      </form>
    </div>
  );
}