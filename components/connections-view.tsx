// components/connections-view.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QuizPathGraph from "@/components/quiz-path-graph";
import SortableGallery from "@/components/sortable-gallery";
import { loadQuizSession, layoutQuizSession, isQuizCompleted } from "@/lib/quiz-graph";
import type { QuizGraphLayout, QuizSession } from "@/lib/quiz-graph";

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

type Mode = "quiz" | "collection";

export default function ConnectionsView({ allImages }: { allImages: GalleryImage[] }) {
  const [session, setSession] = useState<QuizSession | null | undefined>(undefined);
  const [quizGraph, setQuizGraph] = useState<QuizGraphLayout | null>(null);
  const [mode, setMode] = useState<Mode>("quiz");

  useEffect(() => {
    const s = loadQuizSession();
    setSession(s);
    setQuizGraph(s ? layoutQuizSession(s) : null);
  }, []);

  if (session === undefined) {
    return (
      <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
        Loading...
      </div>
    );
  }

  const completed = isQuizCompleted(session);

  if (!session) {
    return (
      <div className="w-full h-full flex items-center justify-center px-6 text-center">
        <p className="text-sm text-gray-400">
          Play the quiz first to see your path here.{" "}
          <Link href="/" className="underline">
            Go to the quiz
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center bg-black/90 backdrop-blur-sm text-white text-xs h-12 px-4">
        <div className="flex items-center gap-3 pr-4 border-r border-white/15 h-full">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            ← back to quiz
          </Link>
        </div>

        <div className="flex items-center gap-1 px-4 border-r border-white/15 h-full">
          {/* <button
            onClick={() => setMode("quiz")}
            className={`px-3 py-1.5 rounded-full transition-colors ${
              mode === "quiz" ? "bg-white text-black" : "text-gray-300 hover:bg-white/10"
            }`}
          >
            your quiz path
          </button>
          <button
            onClick={() => completed && setMode("collection")}
            disabled={!completed}
            title={completed ? undefined : "Finish the quiz to unlock this"}
            className={`px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${
              mode === "collection"
                ? "bg-white text-black"
                : completed
                ? "text-gray-300 hover:bg-white/10"
                : "text-gray-600 cursor-not-allowed"
            }`}
          >
            full collection
            {!completed && <span className="text-[10px]">🔒</span>}
          </button> */}
        </div>

        {mode === "quiz" && (
          <div className="flex items-center gap-4 pl-4 text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-0.5 bg-white" /> kept
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full border border-gray-500" /> passed
            </span>
          </div>
        )}
      </div>

      <div className="w-full h-full">
        {mode === "collection" && completed ? (
          <SortableGallery images={allImages} />
        ) : quizGraph ? (
          <QuizPathGraph
            nodes={quizGraph.nodes}
            edges={quizGraph.edges}
            width={quizGraph.width}
            height={quizGraph.height}
          />
        ) : null}
      </div>
    </div>
  );
}