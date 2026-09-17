// components/quiz-path-graph.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { QuizNode, QuizEdge } from "@/lib/quiz-graph";
import { sharedFields } from "@/lib/quiz-graph";
import { starPoints, starfield } from "@/lib/star-shape";

const OUTER_R = 32;
const INNER_R = 13;
const LABEL_SPACE = 30;

function nodeSeed(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100000;
  return h + 1;
}

export default function QuizPathGraph({
  nodes, edges, width, height,
}: { nodes: QuizNode[]; edges: QuizEdge[]; width: number; height: number }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const totalHeight = height + LABEL_SPACE;
  const bg = starfield(width, totalHeight, 90, 42);

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

  const roundLabels = Array.from(
    new Map(nodes.map((n) => [n.round, n.x])).entries()
  ).sort((a, b) => a[0] - b[0]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        ref={containerRef}
        className="w-full h-full bg-[#05070d] flex items-center justify-start pt-14 pl-6"
      >
        <svg
          viewBox={`0 -${LABEL_SPACE} ${width} ${totalHeight}`}
          width={width * scale}
          height={totalHeight * scale}
        >
          <defs>
            <filter id="star-node-rough" x="-60%" y="-60%" width="220%" height="220%">
              <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="4" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {nodes.map((node) => (
              <clipPath key={node.id} id={`star-clip-${node.id}`}>
                <polygon points={starPoints(0, 0, OUTER_R, INNER_R, 6, nodeSeed(node.id))} />
              </clipPath>
            ))}
          </defs>

          {/* background starfield */}
          {bg.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y - LABEL_SPACE} r={s.r} fill="#ffffff" fillOpacity={s.opacity} />
          ))}

          {roundLabels.map(([round, x]) => (
            <text
              key={round}
              x={x}
              y={-LABEL_SPACE / 2 + 5}
              textAnchor="middle"
              fontSize={11}
              fontFamily="ui-monospace, monospace"
              fill="#ffffff"
              fillOpacity={0.7}
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
                stroke="#4ade80"
                strokeWidth={isHighlighted ? 1.6 : 0.7}
                strokeOpacity={hoveredId ? (isHighlighted ? 0.95 : 0.05) : 0.4}
                filter={isHighlighted ? "url(#glow)" : undefined}
              />
            );
          })}

          {nodes.map((node) => {
            const dimmed = !!hoveredId && hoveredId !== node.id && !connectedIds.has(node.id);
            const starOutline = starPoints(0, 0, OUTER_R, INNER_R, 6, nodeSeed(node.id));
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ cursor: "pointer", opacity: dimmed ? 0.2 : 1 }}
              >
                <polygon points={starOutline} fill="#0f172a" />
                <image
                  href={node.url}
                  x={-OUTER_R} y={-OUTER_R} width={OUTER_R * 2} height={OUTER_R * 2}
                  preserveAspectRatio="xMidYMid slice"
                  opacity={node.chosen ? 1 : 0.4}
                  clipPath={`url(#star-clip-${node.id})`}
                />
                <polygon
                  filter="url(#star-node-rough)"
                  points={starOutline}
                  fill="none"
                  stroke={node.id === hoveredId ? "#4ade80" : node.chosen ? "#16a34a" : "#3f3f46"}
                  strokeWidth={(node.id === hoveredId ? 2.2 : node.chosen ? 1.6 : 1) / scale}
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