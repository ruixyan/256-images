// components/image-card.tsx
"use client";

import { useState } from "react";
import { deleteImage, updateImage, assignImageToFolders, updateCatalogInfo } from "@/lib/actions/images";

type ImageRecord = {
  id: string;
  url: string;
  source_type: string;
  source_url: string | null;
  source_name: string | null;
  note: string | null;
  image_folders: { folder_id: string }[];
  title: string | null;
  artist: string | null;
  date: string | null;
  medium: string | null;
  color: string | null;
  subject_matter: string | null;
};

type Folder = { id: string; name: string };

export default function ImageCard({
  img,
  folders,
}: {
  img: ImageRecord;
  folders: Folder[];
}) {
  const [editing, setEditing] = useState(false);
  const [managingFolders, setManagingFolders] = useState(false);
  const [managingCatalog, setManagingCatalog] = useState(false);

  const currentFolderIds = new Set(img.image_folders.map((f) => f.folder_id));

  if (editing) {
    return (
      <div className="space-y-1 border p-2">
        <img src={img.url} alt={img.source_name ?? ""} className="w-full h-auto" />

        <form
          action={async (formData) => {
            await updateImage(formData);
            setEditing(false);
          }}
          className="space-y-1"
        >
          <input type="hidden" name="id" value={img.id} />
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

        <div className="text-xs">
          {img.title && <p className="font-medium">{img.title}</p>}
          {(img.artist || img.date) && (
            <p className="text-gray-500">
              {img.artist}
              {img.artist && img.date && ", "}
              {img.date}
            </p>
          )}
          {img.medium && <p className="text-gray-400">{img.medium}</p>}
          {img.color && <p className="text-gray-400">Color: {img.color}</p>}
          {img.subject_matter && <p className="text-gray-400">Subject: {img.subject_matter}</p>}
        </div>

        <div className="flex gap-3 text-xs">
          <button
            type="button"
            onClick={() => setManagingFolders((v) => !v)}
            className="underline text-gray-400"
          >
            {managingFolders ? "hide folders" : "manage folders"}
          </button>
          <button
            type="button"
            onClick={() => setManagingCatalog((v) => !v)}
            className="underline text-gray-400"
          >
            {managingCatalog ? "hide details" : "edit details"}
          </button>
        </div>

        {managingFolders && (
          <form
            action={async (formData) => {
              await assignImageToFolders(formData);
              setManagingFolders(false);
            }}
            className="space-y-1 border-t pt-2 mt-1"
          >
            <input type="hidden" name="id" value={img.id} />
            <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
              {folders.length === 0 && <p className="text-gray-400">No folders yet.</p>}
              {folders.map((folder) => (
                <label key={folder.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="folderIds"
                    value={folder.id}
                    defaultChecked={currentFolderIds.has(folder.id)}
                  />
                  {folder.name}
                </label>
              ))}
            </div>
            <button type="submit" className="text-xs underline">
              update folders
            </button>
          </form>
        )}

        {managingCatalog && (
          <form
            action={async (formData) => {
              await updateCatalogInfo(formData);
              setManagingCatalog(false);
            }}
            className="space-y-1 border-t pt-2 mt-1"
          >
            <input type="hidden" name="id" value={img.id} />
            <input
              type="text"
              name="title"
              defaultValue={img.title ?? ""}
              placeholder="Title"
              className="w-full border-b py-1 text-xs focus:outline-none"
            />
            <input
              type="text"
              name="artist"
              defaultValue={img.artist ?? ""}
              placeholder="Artist"
              className="w-full border-b py-1 text-xs focus:outline-none"
            />
            <input
              type="text"
              name="date"
              defaultValue={img.date ?? ""}
              placeholder="Date"
              className="w-full border-b py-1 text-xs focus:outline-none"
            />
            <input
              type="text"
              name="medium"
              defaultValue={img.medium ?? ""}
              placeholder="Medium"
              className="w-full border-b py-1 text-xs focus:outline-none"
            />
            <input
              type="text"
              name="color"
              defaultValue={img.color ?? ""}
              placeholder="Color"
              className="w-full border-b py-1 text-xs focus:outline-none"
            />
            <input
              type="text"
              name="subjectMatter"
              defaultValue={img.subject_matter ?? ""}
              placeholder="Subject matter"
              className="w-full border-b py-1 text-xs focus:outline-none"
            />
            <button type="submit" className="text-xs underline">
              save details
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <img
        src={img.url}
        alt={img.title ?? img.source_name ?? ""}
        className="w-full h-auto cursor-pointer"
        onClick={() => setEditing(true)}
      />
      {img.title && <p className="text-xs font-medium">{img.title}</p>}
      {(img.artist || img.date) && (
        <p className="text-xs text-gray-500">
          {img.artist}
          {img.artist && img.date && ", "}
          {img.date}
        </p>
      )}
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