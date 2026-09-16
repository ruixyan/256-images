// components/connections-view.tsx
"use client";

import { useEffect, useState } from "react";
import ConnectionGraph from "@/components/connection-graph";
import QuizPathGraph from "@/components/quiz-path-graph";
import { loadQuizSession, layoutQuizSession } from "@/lib/quiz-graph";
import type { QuizGraphLayout } from "@/lib/quiz-graph";
import type { PositionedNode, GraphEdge } from "@/lib/graph-layout";

type Mode = "quiz" | "all";

export default function ConnectionsView({
  defaultNodes,
  defaultEdges,
  defaultWidth,
  defaultHeight,
}: {
  defaultNodes: PositionedNode[];
  defaultEdges: GraphEdge[];
  defaultWidth: number;
  defaultHeight: number;
}) {
  const [quizGraph, setQuizGraph] = useState<QuizGraphLayout | null | undefined>(undefined);
  const [mode, setMode] = useState<Mode>("quiz");

  useEffect(() => {
    const session = loadQuizSession();
    const layout = session ? layoutQuizSession(session) : null;
    setQuizGraph(layout);
    setMode(layout ? "quiz" : "all");
  }, []);

  if (quizGraph === undefined) {
    return (
      <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
        Loading connections...
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {quizGraph && (
        <div className="flex gap-1 px-4 py-2 border-b shrink-0 text-xs">
          <button
            onClick={() => setMode("quiz")}
            className={`px-2 py-1 rounded ${mode === "quiz" ? "bg-black text-white" : "text-gray-400 hover:bg-gray-100"}`}
          >
            your quiz path
          </button>
          <button
            onClick={() => setMode("all")}
            className={`px-2 py-1 rounded ${mode === "all" ? "bg-black text-white" : "text-gray-400 hover:bg-gray-100"}`}
          >
            all connections
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0">
        {mode === "quiz" && quizGraph ? (
          <QuizPathGraph
            nodes={quizGraph.nodes}
            edges={quizGraph.edges}
            width={quizGraph.width}
            height={quizGraph.height}
          />
        ) : (
          <ConnectionGraph nodes={defaultNodes} edges={defaultEdges} width={defaultWidth} height={defaultHeight} />
        )}
      </div>
    </div>
  );
}