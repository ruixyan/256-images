"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QuizPathGraph from "@/components/quiz-path-graph";
import SortableGallery from "@/components/sortable-gallery";
import {
  loadQuizSession,
  layoutQuizSession,
  isQuizCompleted,
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

type Mode = "quiz" | "collection";

export default function ConnectionsView({
  allImages,
}: {
  allImages: GalleryImage[];
}) {
  const [session, setSession] = useState<
    QuizSession | null | undefined
  >(undefined);

  const [quizGraph, setQuizGraph] =
    useState<QuizGraphLayout | null>(null);

  const [mode, setMode] = useState<Mode>("quiz");

  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    const s = loadQuizSession();

    setSession(s);
    setQuizGraph(
      s ? layoutQuizSession(s) : null
    );
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
          <Link
            href="/"
            className="underline hover:text-white"
          >
            Go to the quiz
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* =====================================================
          CHART
          ===================================================== */}

      <div className="absolute inset-0">
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

      {/* =====================================================
          BOTTOM INFO / CONTROLS
          ===================================================== */}

      <div className="absolute bottom-5 left-5 z-50">
        {infoOpen && (
          <div
            className="
              absolute
              bottom-12
              left-0
              w-64
              rounded-lg
              border
              border-white/10
              bg-black/85
              backdrop-blur-md
              shadow-2xl
              p-4
              text-white
            "
          >
            <div
              className="
                text-[9px]
                uppercase
                tracking-[0.2em]
                text-gray-500
                mb-4
              "
            >
              Your quiz path
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2 text-gray-300">
                <span className="inline-block w-3 h-0.5 bg-white" />
                <span>kept</span>
              </div>

              <div className="flex items-center gap-2 text-gray-300">
                <span
                  className="
                    inline-block
                    w-2.5
                    h-2.5
                    rounded-full
                    border
                    border-gray-500
                  "
                />
                <span>passed</span>
              </div>
            </div>

            <div className="h-px bg-white/10 my-4" />

            <div className="space-y-2">
              <Link
                href="/"
                className="
                  block
                  text-xs
                  text-gray-400
                  hover:text-white
                  transition-colors
                "
              >
                ← back to quiz
              </Link>

              {completed && (
                <button
                  onClick={() =>
                    setMode(
                      mode === "quiz"
                        ? "collection"
                        : "quiz"
                    )
                  }
                  className="
                    block
                    text-xs
                    text-gray-400
                    hover:text-white
                    transition-colors
                  "
                >
                  {mode === "quiz"
                    ? "view full collection"
                    : "view quiz path"}
                </button>
              )}
            </div>

            <div
              className="
                mt-4
                pt-3
                border-t
                border-white/10
                text-[10px]
                leading-relaxed
                text-gray-600
              "
            >
              Drag to move around the chart.
              <br />
              Scroll to zoom.
              <br />
              Hover a star to explore.
            </div>
          </div>
        )}

        <button
          onClick={() =>
            setInfoOpen((open) => !open)
          }
          className="
            w-9
            h-9
            rounded-full
            border
            border-white/15
            bg-black/75
            backdrop-blur-md
            text-gray-400
            hover:text-white
            hover:bg-black/90
            transition-colors
            flex
            items-center
            justify-center
            text-[11px]
          "
          aria-label="Chart information"
          aria-expanded={infoOpen}
        >
          {infoOpen ? "×" : "N"}
        </button>
      </div>
    </div>
  );
}
