// components/quiz-path-graph.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { QuizNode, QuizEdge } from "@/lib/quiz-graph";
import { sharedFields } from "@/lib/quiz-graph";

const IMG_SIZE = 64;
const LABEL_SPACE = 30; // room reserved above the graph for round labels

export default function QuizPathGraph({
  nodes, edges, width, height,
}: { nodes: QuizNode[]; edges: QuizEdge[]; width: number; height: number }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const totalHeight = height + LABEL_SPACE;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width: cw, height: ch } = entry.contentRect;
      const nextScale = Math.min(1, cw / width, ch / totalHeight);
      setScale(nextScale > 0 ? nextScale : 1);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [width, totalHeight]);

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const hovered = hoveredId ? nodeById.get(hoveredId) ?? null : null;

  const touchingEdges = hoveredId
    ? edges.filter((e) => e.source === hoveredId || e.target === hoveredId)
    : [];
  const connectedIds = new Set(touchingEdges.flatMap((e) => [e.source, e.target]));

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

  // One label per distinct column (round), positioned at that round's x.
  const roundLabels = Array.from(
    new Map(nodes.map((n) => [n.round, n.x])).entries()
  ).sort((a, b) => a[0] - b[0]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        ref={containerRef}
        className="w-full h-full bg-gray-50 flex items-center justify-start pt-14 pl-6"
      >
        <svg
          viewBox={`0 -${LABEL_SPACE} ${width} ${totalHeight}`}
          width={width * scale}
          height={totalHeight * scale}
        >
          {roundLabels.map(([round, x]) => (
            <text
              key={round}
              x={x}
              y={-LABEL_SPACE / 2 + 5}
              textAnchor="middle"
              fontSize={11}
              fontFamily="ui-monospace, monospace"
              fill="#166534"
              letterSpacing="0.05em"
            >
              ROUND {round}
            </text>
          ))}

          {edges.map((e, i) => {
            const a = nodeById.get(e.source), b = nodeById.get(e.target);
            if (!a || !b) return null;
            const isHighlighted = !!hoveredId && (e.source === hoveredId || e.target === hoveredId);
            return (
              <line
                key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke="#16a34a"
                strokeWidth={isHighlighted ? 2 : 1}
                strokeOpacity={hoveredId ? (isHighlighted ? 0.95 : 0.06) : 0.3}
                vectorEffect="non-scaling-stroke"
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
                <rect
                  x={-IMG_SIZE / 2} y={-IMG_SIZE / 2} width={IMG_SIZE} height={IMG_SIZE}
                  fill="#fff"
                />
                <image
                  href={node.url}
                  x={-IMG_SIZE / 2} y={-IMG_SIZE / 2} width={IMG_SIZE} height={IMG_SIZE}
                  preserveAspectRatio="xMidYMid meet"
                  opacity={node.chosen ? 1 : 0.45}
                />
                <rect
                  x={-IMG_SIZE / 2} y={-IMG_SIZE / 2} width={IMG_SIZE} height={IMG_SIZE}
                  fill="none"
                  stroke={node.id === hoveredId ? "#166534" : node.chosen ? "#16a34a" : "#ccc"}
                  strokeWidth={(node.id === hoveredId ? 3 : node.chosen ? 2 : 1) / scale}
                  strokeDasharray={node.chosen ? undefined : "3,3"}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Sliding hover panel — off-canvas until something is hovered */}
      <div
        className={`absolute top-0 right-0 bottom-0 w-80 bg-black text-white p-5 overflow-y-auto shadow-2xl transition-transform duration-300 ease-out ${
          hovered ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
      >
        {hovered && (
          <div>
            <img
              src={hovered.url}
              alt={hovered.title ?? ""}
              className="w-full max-h-48 object-contain mb-3 border border-gray-700 bg-gray-900"
            />
            <p className="text-sm font-medium leading-snug">{hovered.title || "Untitled"}</p>
            {metaLine2 && <p className="text-xs text-gray-400 leading-snug">{metaLine2}</p>}
            {metaLine3 && <p className="text-xs text-gray-500 leading-snug mb-1">{metaLine3}</p>}
            <p className="text-xs text-green-500 mb-4">
              Round {hovered.round} · {hovered.chosen ? "kept" : "passed on"}
            </p>

            {incoming.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">
                  Why it showed up here
                </p>
                <ul className="space-y-2">
                  {incoming.map(({ node, shared }) => (
                    <li key={node.id} className="text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <img src={node.url} className="w-6 h-6 object-cover border border-gray-700" alt="" />
                        <span className="text-gray-400">{node.title || "Untitled"} (round {node.round})</span>
                      </div>
                      {shared.length > 0 ? (
                        <p className="text-green-500 pl-8">
                          Matches: {shared.map((s) => `${s.field} (${s.value})`).join(", ")}
                        </p>
                      ) : (
                        <p className="text-gray-600 pl-8">Selected as a top overall match, no single shared field</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {outgoing.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">
                  Influenced these picks
                </p>
                <ul className="space-y-2">
                  {outgoing.map(({ node, shared }) => (
                    <li key={node.id} className="text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <img src={node.url} className="w-6 h-6 object-cover border border-gray-700" alt="" />
                        <span className="text-gray-400">{node.title || "Untitled"} (round {node.round})</span>
                      </div>
                      {shared.length > 0 ? (
                        <p className="text-green-500 pl-8">
                          Matches: {shared.map((s) => `${s.field} (${s.value})`).join(", ")}
                        </p>
                      ) : (
                        <p className="text-gray-600 pl-8">Selected as a top overall match, no single shared field</p>
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