
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QuizPathGraph from "@/components/quiz-path-graph";
import {
  loadQuizSession,
  layoutQuizSession,
} from "@/lib/quiz-graph";
import type {
  QuizGraphLayout,
  QuizSession,
} from "@/lib/quiz-graph";

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

type Props = {
  participantName: string;
  myImages: GalleryImage[];
  selectedImageIds: string[];
  globalCounts: Record<string, number>;
  totalParticipants: number;
};

export default function ParticipantGraph({
  participantName,
  myImages,
  selectedImageIds,
  globalCounts,
  totalParticipants,
}: Props) {
  const [session, setSession] = useState<QuizSession | null | undefined>(
    undefined
  );

  const [quizGraph, setQuizGraph] = useState<QuizGraphLayout | null>(null);

  useEffect(() => {
    const currentSession = loadQuizSession();

    setSession(currentSession);

    if (currentSession) {
      const layout = layoutQuizSession(currentSession);
      const selectedIds = new Set(selectedImageIds);

      const participantNodes = layout.nodes.map((node) => ({
        ...node,
        chosen: selectedIds.has(node.id),
      }));

      setQuizGraph({
        ...layout,
        nodes: participantNodes,
      });
    } else {
      setQuizGraph(null);
    }
  }, [selectedImageIds]);

  if (session === undefined) {
    return (
      <div className="w-full flex items-center justify-center py-20 text-sm text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-lg">
          {participantName}'s collection
        </h1>

        <Link
          href="/results"
          className="text-xs underline text-gray-400"
        >
          all results
        </Link>
      </div>

      <p className="text-xs text-gray-400 mb-8">
        {myImages.length} images chosen
      </p>

      {session && quizGraph ? (
        <div className="relative -mx-6 h-[calc(100vh-180px)] min-h-[650px]">
          <QuizPathGraph
            nodes={quizGraph.nodes}
            edges={quizGraph.edges}
            width={quizGraph.width}
            height={quizGraph.height}
          />
        </div>
      ) : (
        <div className="border-t pt-8">
          <p className="text-sm text-gray-400 mb-6">
            This participant's selections are shown below, but the original
            quiz session is not available in this browser.
          </p>

          {myImages.length === 0 ? (
            <p className="text-sm text-gray-400">
              Didn't keep any images this round.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
              {myImages.map((image) => {
                const count = globalCounts[image.id] ?? 0;
                const isPopular =
                  count >= totalParticipants * 0.5;

                return (
                  <div key={image.id}>
                    <img
                      src={image.url}
                      alt={image.title ?? ""}
                      className="w-full h-auto border"
                    />

                    <p className="text-xs font-medium mt-1 truncate">
                      {image.title || "Untitled"}
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
      )}
    </div>
  );
}

