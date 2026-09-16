// components/connection-graph.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import type { PositionedNode, GraphEdge, EdgeType } from "@/lib/graph-layout";

const EDGE_COLORS: Record<EdgeType, string> = {
  color: "#e0776d",
  medium: "#4f9c6d",
  subject: "#5a8fd0",
};

const IMG_MAX_DIM = 64;
const MIN_SCALE = 0.2;
const MAX_SCALE = 6;

type View = { x: number; y: number; scale: number };

export default function ConnectionGraph({
  nodes = [], edges = [], width, height,
}: { nodes: PositionedNode[]; edges: GraphEdge[]; width: number; height: number }) {
  const [visibleTypes, setVisibleTypes] = useState<Set<EdgeType>>(
    new Set(["color", "medium", "subject"])
  );
  const [hovered, setHovered] = useState<string | null>(null);

  const currentView = useRef<View>({ x: 0, y: 0, scale: 1 });
  const groupRef = useRef<SVGGElement>(null);
  const rafId = useRef<number | null>(null);

  function applyTransform() {
    const v = currentView.current;
    if (groupRef.current) {
      groupRef.current.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.scale})`;
    }
  }

  function scheduleTransformUpdate() {
    if (rafId.current != null) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      applyTransform();
    });
  }

  const dragState = useRef<{ startX: number; startY: number; viewX: number; viewY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  function toggleType(type: EdgeType) {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  }

  // Memoized so a hover-only state change doesn't rebuild these on every
  // enter/leave — they only need to recompute when the actual graph data or
  // the type filters change.
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const visibleEdges = useMemo(
    () => edges.filter((e) => visibleTypes.has(e.type)),
    [edges, visibleTypes]
  );
  const hubNodes = useMemo(() => nodes.filter((n) => n.kind === "hub"), [nodes]);
  const imageNodes = useMemo(() => nodes.filter((n) => n.kind === "image"), [nodes]);

  const connectedIds = useMemo(
    () =>
      new Set(
        hovered
          ? visibleEdges
              .filter((e) => e.source === hovered || e.target === hovered)
              .flatMap((e) => [e.source, e.target])
          : []
      ),
    [hovered, visibleEdges]
  );

  function handleWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * width;
    const cy = ((e.clientY - rect.top) / rect.height) * height;

    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const prev = currentView.current;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor));
    const newX = cx - ((cx - prev.x) / prev.scale) * newScale;
    const newY = cy - ((cy - prev.y) / prev.scale) * newScale;
    currentView.current = { x: newX, y: newY, scale: newScale };
    scheduleTransformUpdate();
  }

  function handleMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    e.preventDefault();
    const v = currentView.current;
    dragState.current = { startX: e.clientX, startY: e.clientY, viewX: v.x, viewY: v.y };
    // Dropping any hover highlight the moment a drag starts avoids firing
    // setHovered repeatedly as the cursor sweeps over nodes mid-drag.
    setHovered(null);
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const drag = dragState.current;
    if (!drag || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const dx = ((e.clientX - drag.startX) / rect.width) * width;
    const dy = ((e.clientY - drag.startY) / rect.height) * height;
    currentView.current = { ...currentView.current, x: drag.viewX + dx, y: drag.viewY + dy };
    scheduleTransformUpdate();
  }

  function stopDrag() {
    dragState.current = null;
  }

  function resetView() {
    currentView.current = { x: 0, y: 0, scale: 1 };
    applyTransform();
  }

  // While actively dragging, hover changes are ignored entirely — this is
  // the main fix: it stops the mass of enter/leave events a fast drag
  // generates over a dense field of thumbnails from each triggering a
  // full re-render.
  function handleNodeEnter(id: string) {
    if (dragState.current) return;
    setHovered(id);
  }
  function handleNodeLeave() {
    if (dragState.current) return;
    setHovered(null);
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex gap-4 px-4 py-2 text-xs items-center border-b shrink-0">
        {(["color", "medium", "subject"] as const).map((type) => (
          <label key={type} className="flex items-center gap-1.5">
            <input type="checkbox" checked={visibleTypes.has(type)} onChange={() => toggleType(type)} />
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: EDGE_COLORS[type] }} />
            {type}
          </label>
        ))}
        <button onClick={resetView} className="underline text-gray-400 ml-auto">
          reset view
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full flex-1 bg-gray-50 cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onDragStart={(e) => e.preventDefault()}
      >
        <g ref={groupRef} style={{ willChange: "transform" }}>
          {visibleEdges.map((e, i) => {
            const a = nodeById.get(e.source), b = nodeById.get(e.target);
            if (!a || !b) return null;
            const isHighlighted = !!hovered && (e.source === hovered || e.target === hovered);
            return (
              <line
                key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={EDGE_COLORS[e.type]}
                strokeWidth={isHighlighted ? 2 : 0.7}
                strokeOpacity={hovered ? (isHighlighted ? 0.9 : 0.05) : 0.35}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          {hubNodes.map((node) => {
            if (node.kind !== "hub" || !visibleTypes.has(node.type)) return null;
            const r = node.r - 14;
            const dimmed = !!hovered && hovered !== node.id && !connectedIds.has(node.id);
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => handleNodeEnter(node.id)}
                onMouseLeave={handleNodeLeave}
                style={{ cursor: "pointer", opacity: dimmed ? 0.2 : 1 }}
              >
                <circle r={r} fill={EDGE_COLORS[node.type]} fillOpacity={0.2} stroke={EDGE_COLORS[node.type]} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                <text y={-r - 6} textAnchor="middle" fontSize={10} fill="#555" fontFamily="ui-monospace, monospace">
                  {node.label}
                </text>
              </g>
            );
          })}

          {imageNodes.map((node) => {
            if (node.kind !== "image") return null;
            const size = IMG_MAX_DIM;
            const dimmed = !!hovered && hovered !== node.id && !connectedIds.has(node.id);
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => handleNodeEnter(node.id)}
                onMouseLeave={handleNodeLeave}
                style={{ cursor: "pointer", opacity: dimmed ? 0.25 : 1 }}
              >
                <image
                  href={node.url}
                  x={-size / 2} y={-size / 2} width={size} height={size}
                  preserveAspectRatio="xMidYMid slice"
                />
                <rect x={-size / 2} y={-size / 2} width={size} height={size} fill="none" stroke="#fff" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}