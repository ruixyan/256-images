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
    const id = setInterval(() => {
      const s = loadQuizSession();
      setGraph(s ? layoutQuizSession(s) : null);
    }, 1500);
    return () => clearInterval(id);
  }, []);

  if (!graph || graph.nodes.length === 0) return null;

  return (
    <Link href="/connections" className="self-start shrink-0 flex flex-col items-center">
      <div
        className="bg-white rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
        style={{ width: 96, height: 96 }}
      >
        <svg viewBox={`0 0 ${graph.width} ${graph.height}`} className="w-full h-full bg-gray-50">
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
              r={n.chosen ? 8 : 4}
              fill={n.chosen ? "#111" : "#ccc"}
            />
          ))}
        </svg>
      </div>
      <p className="text-[9px] text-gray-400 mt-1.5 text-center">view connections</p>
    </Link>
  );
}