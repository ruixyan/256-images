// components/sortable-gallery.tsx
"use client";

import { useMemo, useState } from "react";

type GalleryImage = {
  id: string;
  url: string;
  title: string | null;
  artist: string | null;
  date: string | null;
  color: string | null;
  medium: string | null;
  subject_matter: string | null;
};

type SortField = "title" | "artist" | "date" | "color" | "medium" | "subject_matter";

const FIELD_LABELS: Record<SortField, string> = {
  title: "Title",
  artist: "Artist",
  date: "Date",
  color: "Color",
  medium: "Medium",
  subject_matter: "Subject",
};

export default function SortableGallery({ images }: { images: GalleryImage[] }) {
  const [sortField, setSortField] = useState<SortField>("title");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function handleSortClick(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    const withValue = images.map((img) => ({
      img,
      value: (img[sortField] ?? "").trim().toLowerCase(),
    }));
    withValue.sort((a, b) => {
      if (!a.value && !b.value) return 0;
      if (!a.value) return 1; // blanks always sort last, regardless of direction
      if (!b.value) return -1;
      const cmp = a.value.localeCompare(b.value);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return withValue.map((w) => w.img);
  }, [images, sortField, sortDir]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex flex-wrap gap-1 px-4 py-2 text-xs border-b shrink-0">
        {(Object.keys(FIELD_LABELS) as SortField[]).map((field) => (
          <button
            key={field}
            onClick={() => handleSortClick(field)}
            className={`px-2 py-1 rounded ${
              sortField === field ? "bg-green-600 text-white" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {FIELD_LABELS[field]} {sortField === field && (sortDir === "asc" ? "↑" : "↓")}
          </button>
        ))}
        <span className="text-gray-400 ml-auto">{images.length} images</span>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
          {sorted.map((img) => (
            <div key={img.id}>
              <img src={img.url} alt={img.title ?? ""} className="w-full aspect-square object-cover border" />
              <p className="text-xs font-medium mt-1 truncate">{img.title || "Untitled"}</p>
              <p className="text-xs text-gray-500 truncate">
                {[img.artist, img.date].filter(Boolean).join(", ")}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {[img.medium, img.color, img.subject_matter].filter(Boolean).join(" · ")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}