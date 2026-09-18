// components/quiz-path-graph.tsx
"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { QuizNode, QuizEdge } from "@/lib/quiz-graph";
import { starPoints, starfield } from "@/lib/star-shape";

const OUTER_R = 32;
const INNER_R = 13;
const LABEL_SPACE = 30;

function nodeSeed(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100000;
  return h + 1;
}

const SHARED_CLIP_POINTS = starPoints(0, 0, OUTER_R, INNER_R, 6, 1);

function StarGlyph({
  node,
  isHovered,
  onEnter,
  onLeave,
  scale,
}: {
  node: QuizNode;
  isHovered: boolean;
  onEnter?: (id: string) => void;
  onLeave?: () => void;
  scale: number;
}) {
  const outline = starPoints(0, 0, OUTER_R, INNER_R, 6, nodeSeed(node.id));
  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onMouseEnter={onEnter ? () => onEnter(node.id) : undefined}
      onMouseLeave={onLeave}
      style={{ cursor: onEnter ? "pointer" : "default" }}
    >
      <polygon points={outline} fill="#0f172a" />
      <image
        href={node.url}
        x={-OUTER_R} y={-OUTER_R} width={OUTER_R * 2} height={OUTER_R * 2}
        preserveAspectRatio="xMidYMid slice"
        opacity={node.chosen ? 1 : 0.4}
        clipPath="url(#star-clip-shared)"
      />
      <polygon
        filter={isHovered ? "url(#star-node-rough)" : undefined}
        points={outline}
        fill="none"
        stroke={isHovered ? "#ffffff" : node.chosen ? "#ffffff" : "#3f3f46"}
        strokeOpacity={isHovered ? 1 : node.chosen ? 0.65 : 1}
        strokeWidth={(isHovered ? 1.2 : node.chosen ? 1.6 : 1) / scale}
        strokeDasharray={node.chosen ? undefined : "3,3"}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

// Everything here is rendered once and never touched again on hover — its
// props (nodes/edges/scale/bg/roundLabels/onEnter) don't change when the
// parent's hoveredId state changes, so React.memo means this subtree simply
// doesn't re-render on hover at all, no matter how large the collection is.
const BaseLayer = memo(function BaseLayer({
  nodes, edges, width, totalHeight, scale, bg, roundLabels, onEnter, onLeave,
}: {
  nodes: QuizNode[];
  edges: QuizEdge[];
  width: number;
  totalHeight: number;
  scale: number;
  bg: { x: number; y: number; r: number; opacity: number }[];
  roundLabels: [number, number][];
  onEnter: (id: string) => void;
  onLeave: () => void;
}) {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  return (
    <>
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
        return (
          <line
            key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke="#ffffff"
            strokeWidth={0.7}
            strokeOpacity={0.4}
          />
        );
      })}

      {nodes.map((node) => (
        <StarGlyph key={node.id} node={node} isHovered={false} onEnter={onEnter} onLeave={onLeave} scale={scale} />
      ))}
    </>
  );
});

// Small, bounded-size layer redrawn on every hover: a dimming rect plus just
// the hovered star and whatever it's directly connected to — never the
// whole collection, so its cost stays flat regardless of graph size.
function HighlightOverlay({
  hoveredId, nodeById, connectedNodesOf, edgeTouching, edges, width, totalHeight, scale,
}: {
  hoveredId: string | null;
  nodeById: Map<string, QuizNode>;
  connectedNodesOf: Map<string, Set<string>>;
  edgeTouching: Map<string, number[]>;
  edges: QuizEdge[];
  width: number;
  totalHeight: number;
  scale: number;
}) {
  if (!hoveredId) return null;
  const hoveredNode = nodeById.get(hoveredId);
  if (!hoveredNode) return null;

  const connectedIds = connectedNodesOf.get(hoveredId) ?? new Set<string>();
  const touchingEdgeIdx = edgeTouching.get(hoveredId) ?? [];

  return (
    <g pointerEvents="none">
      <rect x={0} y={-LABEL_SPACE} width={width} height={totalHeight} fill="#05070d" fillOpacity={0.82} />

      {touchingEdgeIdx.map((i) => {
        const e = edges[i];
        const a = nodeById.get(e.source), b = nodeById.get(e.target);
        if (!a || !b) return null;
        return (
          <line
            key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke="#ffffff"
            strokeWidth={1.6}
            strokeOpacity={0.95}
            filter="url(#glow)"
          />
        );
      })}

      {[...connectedIds].map((id) => {
        const n = nodeById.get(id);
        if (!n) return null;
        return <StarGlyph key={id} node={n} isHovered={false} scale={scale} />;
      })}

      <StarGlyph node={hoveredNode} isHovered scale={scale} />
    </g>
  );
}

export default function QuizPathGraph({
  nodes, edges, width, height,
}: { nodes: QuizNode[]; edges: QuizEdge[]; width: number; height: number }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const totalHeight = height + LABEL_SPACE;
  const bg = useMemo(() => starfield(width, totalHeight, 90, 42), [width, totalHeight]);

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

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const { connectedNodesOf, edgeTouching } = useMemo(() => {
    const connected = new Map<string, Set<string>>();
    const touching = new Map<string, number[]>();
    edges.forEach((e, i) => {
      if (!connected.has(e.source)) connected.set(e.source, new Set());
      if (!connected.has(e.target)) connected.set(e.target, new Set());
      connected.get(e.source)!.add(e.target);
      connected.get(e.target)!.add(e.source);
      (touching.get(e.source) ?? touching.set(e.source, []).get(e.source)!).push(i);
      (touching.get(e.target) ?? touching.set(e.target, []).get(e.target)!).push(i);
    });
    return { connectedNodesOf: connected, edgeTouching: touching };
  }, [edges]);

  const handleEnter = useCallback((id: string) => setHoveredId(id), []);
  const handleLeave = useCallback(() => setHoveredId(null), []);

  const hovered = hoveredId ? nodeById.get(hoveredId) ?? null : null;
  const metaLine2 = hovered ? [hovered.artist, hovered.date].filter(Boolean).join(", ") : "";
  const metaLine3 = hovered
    ? [hovered.medium, hovered.color, hovered.subject_matter].filter(Boolean).join(" · ")
    : "";

  const roundLabels = useMemo(
    () =>
      (Array.from(new Map(nodes.map((n) => [n.round, n.x])).entries()) as [number, number][]).sort(
        (a, b) => a[0] - b[0]
      ),
    [nodes]
  );

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-[#05070d]">
      <div className="w-full h-full overflow-auto pt-14 pl-6">
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
            <clipPath id="star-clip-shared">
              <polygon points={SHARED_CLIP_POINTS} />
            </clipPath>
          </defs>

          <BaseLayer
            nodes={nodes}
            edges={edges}
            width={width}
            totalHeight={totalHeight}
            scale={scale}
            bg={bg}
            roundLabels={roundLabels}
            onEnter={handleEnter}
            onLeave={handleLeave}
          />

          <HighlightOverlay
            hoveredId={hoveredId}
            nodeById={nodeById}
            connectedNodesOf={connectedNodesOf}
            edgeTouching={edgeTouching}
            edges={edges}
            width={width}
            totalHeight={totalHeight}
            scale={scale}
          />
        </svg>
      </div>

      <div
        className={`absolute top-0 right-0 bottom-0 w-72 bg-black text-white p-4 overflow-y-auto shadow-2xl transition-transform duration-200 ease-out ${
          hovered ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
      >
        {hovered && (
          <>
            <img
              src={hovered.url}
              alt={hovered.title ?? ""}
              className="w-full max-h-40 object-contain mb-3 border border-gray-700 bg-gray-900"
            />
            <p className="text-sm font-medium leading-snug">{hovered.title || "Untitled"}</p>
            {metaLine2 && <p className="text-xs text-gray-400 leading-snug">{metaLine2}</p>}
            {metaLine3 && <p className="text-xs text-gray-500 leading-snug">{metaLine3}</p>}
            <p className="text-xs text-green-500 mt-1">
              Round {hovered.round} · {hovered.chosen ? "kept" : "passed on"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}