// components/quiz-path-graph.tsx
"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { QuizNode, QuizEdge } from "@/lib/quiz-graph";
import { sharedFields } from "@/lib/quiz-graph";
import { starPoints, starfield } from "@/lib/star-shape";
import Link from "next/link";

const OUTER_R = 22;
const INNER_R = 9;

const ROUND_BAR_HEIGHT = 42;

const MIN_SCALE = 0.2;
const MAX_SCALE = 5;

const ZOOM_SENSITIVITY = 0.0012; // lower = less sensitive per unit of scroll

function nodeSeed(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) % 100000;
  }
  return h + 1;
}

const SHARED_CLIP_POINTS = starPoints(0, 0, OUTER_R, INNER_R, 6, 1);

/* =========================================================
   STAR
   ========================================================= */

function StarGlyph({
  node,
  isHovered,
  showImage,
  onEnter,
  onLeave,
}: {
  node: QuizNode;
  isHovered: boolean;
  showImage: boolean;
  onEnter?: (id: string) => void;
  onLeave?: () => void;
}) {
  const outline = starPoints(0, 0, OUTER_R, INNER_R, 6, nodeSeed(node.id));

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onMouseEnter={onEnter ? () => onEnter(node.id) : undefined}
      onMouseLeave={onLeave}
      style={{ cursor: onEnter ? "pointer" : "default" }}
    >
      {/* Dark star body */}
      <polygon points={outline} fill="#0f172a" />

      {/*
        IMPORTANT PERFORMANCE OPTIMIZATION:
        Unchosen images do NOT render an <image> element.
        Chosen images are always visible.
        Unchosen images are only mounted when hovered.
      */}
      {(node.chosen || showImage) && (
        <image
          href={node.url}
          x={-OUTER_R}
          y={-OUTER_R}
          width={OUTER_R * 2}
          height={OUTER_R * 2}
          preserveAspectRatio="xMidYMid slice"
          opacity={node.chosen || isHovered ? 1 : 0.4}
          clipPath="url(#star-clip-shared)"
        />
      )}

      {/* Star outline */}
      <polygon
        filter={isHovered ? "url(#star-node-rough)" : undefined}
        points={outline}
        fill="none"
        stroke={isHovered ? "#ffffff" : node.chosen ? "#ffffff" : "#3f3f46"}
        strokeOpacity={isHovered ? 1 : node.chosen ? 0.65 : 1}
        strokeWidth={isHovered ? 1.5 : node.chosen ? 1.6 : 1}
        strokeDasharray={node.chosen ? undefined : "3,3"}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

/* =========================================================
   BASE GRAPH
   ========================================================= */

const BaseLayer = memo(function BaseLayer({
  nodes,
  edges,
  bg,
  onEnter,
  onLeave,
}: {
  nodes: QuizNode[];
  edges: QuizEdge[];
  bg: { x: number; y: number; r: number; opacity: number }[];
  onEnter: (id: string) => void;
  onLeave: () => void;
}) {
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  return (
    <>
      {/* Background star field */}
      {bg.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#ffffff" fillOpacity={s.opacity} />
      ))}

      {/* Connections */}
      {edges.map((e, i) => {
        const a = nodeById.get(e.source);
        const b = nodeById.get(e.target);
        if (!a || !b) return null;
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="#ffffff"
            strokeWidth={0.7}
            strokeOpacity={0.4}
          />
        );
      })}

      {/* Stars */}
      {nodes.map((node) => (
        <StarGlyph
          key={node.id}
          node={node}
          isHovered={false}
          showImage={false}
          onEnter={onEnter}
          onLeave={onLeave}
        />
      ))}
    </>
  );
});

/* =========================================================
   HOVER HIGHLIGHT
   ========================================================= */

function HighlightOverlay({
  hoveredId,
  nodeById,
  connectedNodesOf,
  edgeTouching,
  edges,
  width,
  height,
}: {
  hoveredId: string | null;
  nodeById: Map<string, QuizNode>;
  connectedNodesOf: Map<string, Set<string>>;
  edgeTouching: Map<string, number[]>;
  edges: QuizEdge[];
  width: number;
  height: number;
}) {
  if (!hoveredId) return null;

  const hoveredNode = nodeById.get(hoveredId);
  if (!hoveredNode) return null;

  const connectedIds = connectedNodesOf.get(hoveredId) ?? new Set<string>();
  const touchingEdgeIdx = edgeTouching.get(hoveredId) ?? [];

  return (
    <g pointerEvents="none">
      {/* Dim entire graph */}
      <rect x={0} y={0} width={width} height={height} fill="#05070d" fillOpacity={0.82} />

      {/* Highlight connected edges */}
      {touchingEdgeIdx.map((i) => {
        const e = edges[i];
        const a = nodeById.get(e.source);
        const b = nodeById.get(e.target);
        if (!a || !b) return null;
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="#ffffff"
            strokeWidth={1.6}
            strokeOpacity={0.95}
            filter="url(#glow)"
          />
        );
      })}

      {/* Connected stars */}
      {[...connectedIds].map((id) => {
        const node = nodeById.get(id);
        if (!node) return null;
        return <StarGlyph key={id} node={node} isHovered={false} showImage={false} />;
      })}

      {/* Actual hovered star */}
      <StarGlyph node={hoveredNode} isHovered showImage />
    </g>
  );
}

/* =========================================================
   MAIN GRAPH
   ========================================================= */

export default function QuizPathGraph({
  nodes,
  edges,
  width,
  height,
}: {
  nodes: QuizNode[];
  edges: QuizEdge[];
  width: number;
  height: number;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const graphGroupRef = useRef<SVGGElement>(null);
  const roundLayerRef = useRef<HTMLDivElement>(null);

  /*
    Pan/zoom lives in refs instead of React state.
    This is intentional: changing these values while dragging
    doesn't cause the entire graph component to render again.
  */
  const viewRef = useRef({ x: 0, y: 0, scale: 1 });
  const rafRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startViewX: number;
    startViewY: number;
    moved: boolean;
  } | null>(null);

  /* =======================================================
     BACKGROUND
     ======================================================= */

  const bg = useMemo(() => starfield(width, height, 90, 42), [width, height]);

  /* =======================================================
     MAPS
     ======================================================= */

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const { connectedNodesOf, edgeTouching } = useMemo(() => {
    const connected = new Map<string, Set<string>>();
    const touching = new Map<string, number[]>();

    edges.forEach((e, i) => {
      if (!connected.has(e.source)) connected.set(e.source, new Set());
      if (!connected.has(e.target)) connected.set(e.target, new Set());
      connected.get(e.source)!.add(e.target);
      connected.get(e.target)!.add(e.source);

      if (!touching.has(e.source)) touching.set(e.source, []);
      if (!touching.has(e.target)) touching.set(e.target, []);
      touching.get(e.source)!.push(i);
      touching.get(e.target)!.push(i);
    });

    return { connectedNodesOf: connected, edgeTouching: touching };
  }, [edges]);

  /* =======================================================
     ROUND POSITIONS
     ======================================================= */

  const roundLabels = useMemo(() => {
    const map = new Map<number, number>();
    for (const node of nodes) {
      if (!map.has(node.round)) map.set(node.round, node.x);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [nodes]);

  /* =======================================================
     APPLY VIEW
     ======================================================= */

  const applyView = useCallback(() => {
    const view = viewRef.current;

    /*
      SVG transform is deliberately kept on the <g> containing the
      chart. The round labels are outside this group, so they
      remain vertically sticky.
    */
    if (graphGroupRef.current) {
      graphGroupRef.current.setAttribute(
        "transform",
        `translate(${view.x} ${view.y}) scale(${view.scale})`
      );
    }

    /*
      Round labels follow the horizontal graph transform, but
      their Y position is completely independent.
    */
    if (roundLayerRef.current) {
      const children = roundLayerRef.current.children;
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement;
        const roundX = Number(child.dataset.x);
        const screenX = view.x + roundX * view.scale;
        child.style.transform = `translateX(${screenX}px) translateX(-50%)`;
      }
    }
  }, []);

  const scheduleViewUpdate = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      applyView();
    });
  }, [applyView]);

  /* =======================================================
     VIEWPORT SIZE
     ======================================================= */

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const { width: cw, height: ch } = entry.contentRect;
      setViewport({ width: cw, height: ch });

      /*
        Only establish the initial camera once. Resizing the
        browser later shouldn't throw the user's pan/zoom away.
      */
      if (initializedRef.current || width <= 0 || height <= 0) return;

      const availableHeight = Math.max(1, ch - ROUND_BAR_HEIGHT);
      const nextScale = Math.min(1, cw / width, availableHeight / height);
      const scale = nextScale > 0 ? nextScale : 1;

      const x = (cw - width * scale) / 2;
      const y = ROUND_BAR_HEIGHT + (availableHeight - height * scale) / 2;

      viewRef.current = { x, y, scale };
      initializedRef.current = true;

      requestAnimationFrame(() => {
        applyView();
      });
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [width, height, applyView]);

  /*
    If the graph data itself changes, allow the camera to
    initialize again.
  */
  useEffect(() => {
    initializedRef.current = false;
  }, [width, height]);

  /* =======================================================
     POINTER / PAN
     ======================================================= */

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;

    const view = viewRef.current;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startViewX: view.x,
      startViewY: view.y,
      moved: false,
    };

    e.currentTarget.setPointerCapture(e.pointerId);
    setHoveredId(null);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;

      viewRef.current = {
        ...viewRef.current,
        x: drag.startViewX + dx,
        y: drag.startViewY + dy,
      };

      scheduleViewUpdate();
    },
    [scheduleViewUpdate]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag && drag.pointerId === e.pointerId) dragRef.current = null;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Pointer capture may already be released.
    }
  }, []);

  const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Nothing to release.
    }
  }, []);

  /* =======================================================
     ZOOM
     ======================================================= */

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();

      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const oldView = viewRef.current;

      /*
        Zoom amount scales with the actual size of the scroll
        delta, not just its sign — a small trackpad nudge barely
        moves the zoom, a deliberate mouse-wheel notch still feels
        responsive. Clamping the delta stops a single huge/glitchy
        event from causing a jarring jump.
      */
      const clampedDelta = Math.max(-120, Math.min(120, e.deltaY));
      const factor = Math.exp(-clampedDelta * ZOOM_SENSITIVITY);

      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldView.scale * factor));
      if (newScale === oldView.scale) return;

      /*
        Keep the graph point underneath the cursor underneath
        the cursor after zooming.
      */
      const graphX = (mouseX - oldView.x) / oldView.scale;
      const graphY = (mouseY - oldView.y) / oldView.scale;

      const newX = mouseX - graphX * newScale;
      const newY = mouseY - graphY * newScale;

      viewRef.current = { x: newX, y: newY, scale: newScale };
      scheduleViewUpdate();
    },
    [scheduleViewUpdate]
  );

  /* =======================================================
     HOVER
     ======================================================= */

  const handleEnter = useCallback((id: string) => {
    /* Don't switch stars while the user is dragging. */
    if (dragRef.current) return;
    setHoveredId(id);
  }, []);

  const handleLeave = useCallback(() => {
    if (dragRef.current) return;
    setHoveredId(null);
  }, []);

  /* =======================================================
     RESET
     ======================================================= */

  const resetView = useCallback(() => {
    const cw = viewport.width;
    const ch = viewport.height;
    if (!cw || !ch || !width || !height) return;

    const availableHeight = Math.max(1, ch - ROUND_BAR_HEIGHT);
    const scale = Math.min(1, cw / width, availableHeight / height);

    viewRef.current = {
      x: (cw - width * scale) / 2,
      y: ROUND_BAR_HEIGHT + (availableHeight - height * scale) / 2,
      scale,
    };

    scheduleViewUpdate();
  }, [viewport.width, viewport.height, width, height, scheduleViewUpdate]);

  /* =======================================================
     HOVER DETAILS
     ======================================================= */

  const hovered = hoveredId ? nodeById.get(hoveredId) ?? null : null;

  const metaLine2 = hovered
    ? [hovered.artist, hovered.date].filter(Boolean).join(", ")
    : "";

  const metaLine3 = hovered
    ? [hovered.medium, hovered.color, hovered.subject_matter].filter(Boolean).join(" · ")
    : "";

  const touchingEdges = hoveredId
    ? edges.filter((e) => e.source === hoveredId || e.target === hoveredId)
    : [];

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

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-[#05070d] select-none">
      {/* Back to home */}
      <Link
        href="/"
        className="absolute top-4 left-4 z-50 rounded-full border border-white/10 bg-black/70 px-3 py-1.5 text-[11px] text-gray-400 backdrop-blur-sm transition-colors hover:bg-black hover:text-white"
      >
        ← home
      </Link>

      {/* ===================================================
          CHART
          =================================================== */}

      <div
        className="absolute inset-0 touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onWheel={handleWheel}
      >
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${Math.max(1, viewport.width)} ${Math.max(1, viewport.height)}`}
          preserveAspectRatio="none"
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

          {/*
            EVERYTHING below here moves together. The round labels
            intentionally are NOT here — they live in the HTML layer
            below and only follow this group's X transform.
          */}
          <g ref={graphGroupRef}>
            <BaseLayer nodes={nodes} edges={edges} bg={bg} onEnter={handleEnter} onLeave={handleLeave} />

            <HighlightOverlay
              hoveredId={hoveredId}
              nodeById={nodeById}
              connectedNodesOf={connectedNodesOf}
              edgeTouching={edgeTouching}
              edges={edges}
              width={width}
              height={height}
            />
          </g>
        </svg>
      </div>

      {/* ===================================================
          STICKY ROUND BAR
          =================================================== */}

      <div className="absolute top-0 left-0 right-0 z-30 h-[42px] overflow-hidden pointer-events-none bg-gradient-to-b from-[#05070d] via-[#05070d]/95 to-transparent">
        <div ref={roundLayerRef} className="absolute inset-0 pointer-events-none">
          {roundLabels.map(([round, x]) => (
            <div
              key={round}
              data-x={x}
              className="absolute top-[15px] left-0 whitespace-nowrap text-[8px] font-mono tracking-[0.08em] text-white/60 will-change-transform"
            >
              ROUND {round}
            </div>
          ))}
        </div>
      </div>

      {/* ===================================================
          HOVER DETAILS
          =================================================== */}

      <div
        className={`absolute top-0 right-0 bottom-0 z-40 w-80 bg-black text-white p-4 overflow-y-auto shadow-2xl transition-transform duration-200 ease-out ${
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
            {metaLine3 && <p className="text-xs text-gray-500 leading-snug mb-1">{metaLine3}</p>}

            <p className="text-xs text-green-500 mb-3">
              Round {hovered.round} · {hovered.chosen ? "kept" : "passed on"}
            </p>

            {incoming.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1.5">
                  Why it showed up here
                </p>
                <ul className="space-y-1.5">
                  {incoming.map(({ node, shared }) => (
                    <li key={node.id} className="text-xs">
                      <div className="flex items-center gap-2 mb-0.5">
                        <img src={node.url} className="w-5 h-5 object-cover border border-gray-700" alt="" />
                        <span className="text-gray-400">
                          {node.title || "Untitled"} (round {node.round})
                        </span>
                      </div>
                      {shared.length > 0 ? (
                        <p className="text-green-500 pl-7">
                          Matches: {shared.map((s) => `${s.field} (${s.value})`).join(", ")}
                        </p>
                      ) : (
                        <p className="text-gray-600 pl-7">Top overall match, no single shared field</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {outgoing.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1.5">
                  Influenced these picks
                </p>
                <ul className="space-y-1.5">
                  {outgoing.map(({ node, shared }) => (
                    <li key={node.id} className="text-xs">
                      <div className="flex items-center gap-2 mb-0.5">
                        <img src={node.url} className="w-5 h-5 object-cover border border-gray-700" alt="" />
                        <span className="text-gray-400">
                          {node.title || "Untitled"} (round {node.round})
                        </span>
                      </div>
                      {shared.length > 0 ? (
                        <p className="text-green-500 pl-7">
                          Matches: {shared.map((s) => `${s.field} (${s.value})`).join(", ")}
                        </p>
                      ) : (
                        <p className="text-gray-600 pl-7">Top overall match, no single shared field</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* ===================================================
          BOTTOM CONTROLS
          =================================================== */}

      <div className="absolute bottom-5 left-5 z-50 flex items-center gap-2">
        <button
          onClick={resetView}
          className="h-9 px-3 rounded-full border border-white/10 bg-black/70 backdrop-blur-md text-[10px] text-gray-400 hover:text-white hover:bg-black/90 transition-colors"
        >
          reset view
        </button>

        <div className="h-9 px-3 rounded-full border border-white/10 bg-black/60 backdrop-blur-md text-[9px] text-gray-600 flex items-center">
          drag · scroll to zoom
        </div>
      </div>
    </div>
  );
}