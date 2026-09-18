
"use client";

import { useState } from "react";
import ParticipantStarGraph from "@/components/participant-star-graph";

type CollectionImage = {
  id: string;
  url: string;
  title: string | null;
  artist: string | null;
  date: string | null;
  color: string | null;
  medium: string | null;
  subject_matter: string | null;
};

export default function ParticipantCollectionView({
  images,
  globalCounts,
  totalParticipants,
}: {
  images: CollectionImage[];
  globalCounts: Record<string, number>;
  totalParticipants: number;
}) {
  const [view, setView] = useState<"grid" | "stars">("grid");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-xs text-gray-400">
          {images.length} images chosen
        </p>

        <div className="flex border border-gray-200">
          <button
            type="button"
            onClick={() => setView("grid")}
            className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] transition ${
              view === "grid"
                ? "bg-black text-white"
                : "bg-white text-gray-400 hover:text-black"
            }`}
          >
            grid
          </button>

          <button
            type="button"
            onClick={() => setView("stars")}
            className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] transition ${
              view === "stars"
                ? "bg-black text-white"
                : "bg-white text-gray-400 hover:text-black"
            }`}
          >
            star chart
          </button>
        </div>
      </div>

      {images.length === 0 ? (
        <p className="text-sm text-gray-400">
          Didn't keep any images this round.
        </p>
      ) : view === "stars" ? (
        <div className="relative -mx-6 h-[calc(100vh-190px)] min-h-[560px]">
          <ParticipantStarGraph images={images} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-5">
          {images.map((img) => {
            const count = globalCounts[img.id] ?? 0;
            const isPopular =
              count >= totalParticipants * 0.5;

            return (
              <div key={img.id}>
                <img
                  src={img.url}
                  alt={img.title ?? ""}
                  className="h-auto w-full border"
                />

                <p className="mt-1 truncate text-xs font-medium">
                  {img.title || "Untitled"}
                </p>

                <p
                  className={`text-xs ${
                    isPopular
                      ? "text-green-700"
                      : "text-gray-400"
                  }`}
                >
                  also chosen by {count}/{totalParticipants} people
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
