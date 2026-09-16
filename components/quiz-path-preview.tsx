// components/quiz-path-preview.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadQuizSession, layoutQuizSession } from "@/lib/quiz-graph";
import type { QuizGraphLayout } from "@/lib/quiz-graph";

export default function QuizPathPreview() {
  const [graph, setGraph] = useState<QuizGraphLayout | null>(null);

  useEffect(() => {
    const session = loadQuizSession();
    setGraph(session ? layoutQuizSession(session) : null);
    // Re-check after each round: this component stays mounted across the
    // whole quiz, so listen for the custom event fired by saveQuizSession's
    // caller isn't set up — simplest reliable approach is polling on an
    // interval, cheap given how small this computation is.
    const id = setInterval(() => {
      const s = loadQuizSession();
      setGraph(s ? layoutQuizSession(s) : null);
    }, 1500);
    return () => clearInterval(id);
  }, []);

  if (!graph || graph.nodes.length === 0) return null;

  return (
    <Link
      href="/connections"
      className="fixed right-5 bottom-5 z-30 w-40 bg-white border rounded-lg shadow-lg p-2 hover:border-black transition-colors"
    >
      <svg viewBox={`0 0 ${graph.width} ${graph.height}`} className="w-full aspect-[4/3] bg-gray-50 rounded">
        {graph.edges.map((e, i) => {
          const a = graph.nodes.find((n) => n.id === e.source);
          const b = graph.nodes.find((n) => n.id === e.target);
          if (!a || !b) return null;
          return (
            <line
              key={i}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="#111" strokeOpacity={0.25} strokeWidth={3}
            />
          );
        })}
        {graph.nodes.map((n) => (
          <circle
            key={n.id}
            cx={n.x} cy={n.y}
            r={n.chosen ? 9 : 5}
            fill={n.chosen ? "#111" : "#ccc"}
          />
        ))}
      </svg>
      <p className="text-[10px] text-gray-400 mt-1.5 text-center">view connections</p>
    </Link>
  );
}