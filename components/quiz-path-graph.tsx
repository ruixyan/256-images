// components/quiz-path-graph.tsx
"use client";

import { useState } from "react";
import type { QuizNode, QuizEdge } from "@/lib/quiz-graph";
import { sharedFields } from "@/lib/quiz-graph";

const IMG_SIZE = 64;

export default function QuizPathGraph({
  nodes, edges, width, height,
}: { nodes: QuizNode[]; edges: QuizEdge[]; width: number; height: number }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const hovered = hoveredId ? nodeById.get(hoveredId) ?? null : null;

  const touchingEdges = hoveredId
    ? edges.filter((e) => e.source === hoveredId || e.target === hoveredId)
    : [];
  const connectedIds = new Set(touchingEdges.flatMap((e) => [e.source, e.target]));

  // Split into incoming (why THIS node connects back to the previous
  // round) and outgoing (which next-round images it fed into), each paired
  // with the shared-field explanation.
  const incoming = hovered
    ? touchingEdges
        .filter((e) => e.target === hovered.id)
        .map((e) => nodeById.get(e.source))
        .filter((n): n is QuizNode => !!n)
        .map((n) => ({ node: n, shared: sharedFields(hovered, n) }))
    : [];
  const outgoing = hovered
    ? touchingEdges
        .filter((e) => e.source === hovered.id)
        .map((e) => nodeById.get(e.target))
        .filter((n): n is QuizNode => !!n)
        .map((n) => ({ node: n, shared: sharedFields(hovered, n) }))
    : [];

  const metaLine2 = hovered ? [hovered.artist, hovered.date].filter(Boolean).join(", ") : "";
  const metaLine3 = hovered
    ? [hovered.medium, hovered.color, hovered.subject_matter].filter(Boolean).join(" · ")
    : "";

  return (
    <div className="w-full h-full flex">
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex gap-4 px-4 py-2 text-xs items-center border-b shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 bg-black" /> kept — continues to the next round
          </span>
          <span className="flex items-center gap-1.5 text-gray-400">
            <span className="inline-block w-3 h-3 rounded-full border border-gray-300" /> passed on — dead end
          </span>
        </div>

        <div className="flex-1 min-h-0 bg-gray-50 overflow-auto p-4">
        <svg
            viewBox={`0 0 ${width} ${height}`}
            width={width}
            height={height}
            className="max-w-none"
          >
            {edges.map((e, i) => {
              const a = nodeById.get(e.source), b = nodeById.get(e.target);
              if (!a || !b) return null;
              const isHighlighted = !!hoveredId && (e.source === hoveredId || e.target === hoveredId);
              return (
                <line
                  key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="#111"
                  strokeWidth={isHighlighted ? 2 : 1}
                  strokeOpacity={hoveredId ? (isHighlighted ? 0.9 : 0.06) : 0.25}
                />
              );
            })}

            {nodes.map((node) => {
              const dimmed = !!hoveredId && hoveredId !== node.id && !connectedIds.has(node.id);
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ cursor: "pointer", opacity: dimmed ? 0.25 : 1 }}
                >
                  <image
                    href={node.url}
                    x={-IMG_SIZE / 2} y={-IMG_SIZE / 2} width={IMG_SIZE} height={IMG_SIZE}
                    preserveAspectRatio="xMidYMid slice"
                    opacity={node.chosen ? 1 : 0.45}
                  />
                  <rect
                    x={-IMG_SIZE / 2} y={-IMG_SIZE / 2} width={IMG_SIZE} height={IMG_SIZE}
                    fill="none"
                    stroke={node.id === hoveredId ? "#000" : node.chosen ? "#111" : "#ccc"}
                    strokeWidth={node.id === hoveredId ? 3 : node.chosen ? 2 : 1}
                    strokeDasharray={node.chosen ? undefined : "3,3"}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Hover panel */}
      <div className="w-80 shrink-0 border-l p-5 overflow-y-auto">
        {!hovered ? (
          <p className="text-xs text-gray-400">Hover an image to see its details and why it connects.</p>
        ) : (
          <div>
            <img
              src={hovered.url}
              alt={hovered.title ?? ""}
              className="w-full max-h-48 object-contain mb-3 border bg-gray-50"
            />
            <p className="text-sm font-medium leading-snug">{hovered.title || "Untitled"}</p>
            {metaLine2 && <p className="text-xs text-gray-500 leading-snug">{metaLine2}</p>}
            {metaLine3 && <p className="text-xs text-gray-400 leading-snug mb-1">{metaLine3}</p>}
            <p className="text-xs text-gray-400 mb-4">
              Round {hovered.round} · {hovered.chosen ? "kept" : "passed on"}
            </p>

            {incoming.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">
                  Why it showed up here
                </p>
                <ul className="space-y-2">
                  {incoming.map(({ node, shared }) => (
                    <li key={node.id} className="text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <img src={node.url} className="w-6 h-6 object-cover border" alt="" />
                        <span className="text-gray-500">{node.title || "Untitled"} (round {node.round})</span>
                      </div>
                      {shared.length > 0 ? (
                        <p className="text-gray-400 pl-8">
                          Matches: {shared.map((s) => `${s.field} (${s.value})`).join(", ")}
                        </p>
                      ) : (
                        <p className="text-gray-300 pl-8">Selected as a top overall match, no single shared field</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {outgoing.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">
                  Influenced these picks
                </p>
                <ul className="space-y-2">
                  {outgoing.map(({ node, shared }) => (
                    <li key={node.id} className="text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <img src={node.url} className="w-6 h-6 object-cover border" alt="" />
                        <span className="text-gray-500">{node.title || "Untitled"} (round {node.round})</span>
                      </div>
                      {shared.length > 0 ? (
                        <p className="text-gray-400 pl-8">
                          Matches: {shared.map((s) => `${s.field} (${s.value})`).join(", ")}
                        </p>
                      ) : (
                        <p className="text-gray-300 pl-8">Selected as a top overall match, no single shared field</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}