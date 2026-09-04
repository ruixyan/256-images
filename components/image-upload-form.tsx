// components/ImageUploadForm.tsx
"use client";

import { useState } from "react";
import { addImageFromFile, addImageFromLink } from "@/lib/actions/images";

export default function ImageUploadForm() {
  const [mode, setMode] = useState<"upload" | "link">("upload");

  return (
    <form
      action={mode === "upload" ? addImageFromFile : addImageFromLink}
      className="max-w-md space-y-4 border-b pb-6 mb-6"
    >
      <div className="flex gap-4 text-sm">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={mode === "upload" ? "underline" : "text-gray-400"}
        >
          Upload file
        </button>
        <button
          type="button"
          onClick={() => setMode("link")}
          className={mode === "link" ? "underline" : "text-gray-400"}
        >
          Use link
        </button>
      </div>

      {mode === "upload" ? (
        <input
          type="file"
          name="file"
          accept="image/*"
          required
          className="text-sm"
        />
      ) : (
        <input
          type="url"
          name="link"
          placeholder="Image URL"
          required
          className="w-full border-b py-1 text-sm focus:outline-none"
        />
      )}

      <input
        type="text"
        name="sourceName"
        placeholder="Source"
        className="w-full border-b py-1 text-sm focus:outline-none"
      />

      <textarea
        name="note"
        placeholder="Notes"
        rows={2}
        className="w-full border-b py-1 text-sm resize-none focus:outline-none"
      />

      <button
        type="submit"
        className="text-sm border px-3 py-1 hover:bg-gray-50"
      >
        Add image
      </button>
    </form>
  );
}