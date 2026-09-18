"use client";

import { useMemo, useRef, useState } from "react";
import type {
  PositionedNode,
  GraphEdge,
  EdgeType,
} from "@/lib/graph-layout";

const EDGE_COLORS: Record<EdgeType, string> = {
  color: "#e0776d",
  medium: "#4f9c6d",
  subject: "#5a8fd0",
};

const IMG_MAX_DIM = 64;
const MIN_SCALE = 0.2;
const MAX_SCALE = 6;

type View = {
  x: number;
  y: number;
  scale: number;
};

export type RoundMarker = {
  label: string;
  x: number;
};

type Props = {
  nodes: PositionedNode[];
  edges: GraphEdge[];
  width: number;
  height: number;

  /**
   * X positions are in the same coordinate system as the graph.
   *
   * Example:
   *
   * [
   *   { label: "ROUND 1", x: 80 },
   *   { label: "ROUND 2", x: 240 },
   *   { label: "ROUND 3", x: 400 },
   * ]
   */
  rounds?: RoundMarker[];
};

export default function ConnectionGraph({
  nodes = [],
  edges = [],
  width,
  height,
  rounds = [],
}: Props) {
  const [visibleTypes, setVisibleTypes] = useState<Set<EdgeType>>(
    new Set(["color", "medium", "subject"])
  );

  const [hovered, setHovered] = useState<string | null>(null);
  const [controlsOpen, setControlsOpen] = useState(false);

  const currentView = useRef<View>({
    x: 0,
    y: 0,
    scale: 1,
  });

  const groupRef = useRef<SVGGElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  /*
   * This is the sticky round-header layer.
   *
   * It does NOT move vertically.
   * We only change its X transform when the graph pans/zooms.
   */
  const roundsRef = useRef<HTMLDivElement>(null);

  const rafId = useRef<number | null>(null);

  const dragState = useRef<{
    startX: number;
    startY: number;
    viewX: number;
    viewY: number;
  } | null>(null);

  /*
   * ------------------------------------------------------------
   * GRAPH DATA
   * ------------------------------------------------------------
   */

  const nodeById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes]
  );

  const visibleEdges = useMemo(
    () => edges.filter((edge) => visibleTypes.has(edge.type)),
    [edges, visibleTypes]
  );

  const hubNodes = useMemo(
    () => nodes.filter((node) => node.kind === "hub"),
    [nodes]
  );

  const imageNodes = useMemo(
    () => nodes.filter((node) => node.kind === "image"),
    [nodes]
  );

  /*
   * Precompute adjacency.
   *
   * This avoids doing:
   *
   * visibleEdges.filter(...)
   *
   * every time the user hovers a node.
   */
  const connectionsByNode = useMemo(() => {
    const map = new Map<string, Set<string>>();

    for (const edge of visibleEdges) {
      let sourceConnections = map.get(edge.source);

      if (!sourceConnections) {
        sourceConnections = new Set<string>();
        map.set(edge.source, sourceConnections);
      }

      sourceConnections.add(edge.target);

      let targetConnections = map.get(edge.target);

      if (!targetConnections) {
        targetConnections = new Set<string>();
        map.set(edge.target, targetConnections);
      }

      targetConnections.add(edge.source);
    }

    return map;
  }, [visibleEdges]);

  const connectedIds = useMemo(() => {
    if (!hovered) {
      return new Set<string>();
    }

    const connected = connectionsByNode.get(hovered);

    if (!connected) {
      return new Set<string>([hovered]);
    }

    return new Set<string>([
      hovered,
      ...connected,
    ]);
  }, [hovered, connectionsByNode]);

  /*
   * ------------------------------------------------------------
   * TRANSFORM
   * ------------------------------------------------------------
   */

  function applyTransform() {
    const view = currentView.current;

    /*
     * Main chart.
     */
    if (groupRef.current) {
      groupRef.current.style.transform =
        `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
    }

    /*
     * Sticky rounds.
     *
     * The rounds stay at the top of the viewport, but their
     * horizontal positions follow the graph.
     *
     * Each round's original x position is transformed using:
     *
     *     x * scale + pan
     *
     * The whole round strip therefore moves horizontally with
     * the chart while remaining vertically fixed.
     */
    if (roundsRef.current) {
      roundsRef.current.style.transform =
        `translateX(${view.x}px) scaleX(${view.scale})`;
    }
  }

  function scheduleTransformUpdate() {
    if (rafId.current !== null) {
      return;
    }

    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      applyTransform();
    });
  }

  /*
   * ------------------------------------------------------------
   * ZOOM
   * ------------------------------------------------------------
   */

  function handleWheel(
    e: React.WheelEvent<SVGSVGElement>
  ) {
    e.preventDefault();

    const svg = svgRef.current;

    if (!svg) {
      return;
    }

    const rect = svg.getBoundingClientRect();

    const cx =
      ((e.clientX - rect.left) / rect.width) *
      width;

    const cy =
      ((e.clientY - rect.top) / rect.height) *
      height;

    const factor = e.deltaY < 0 ? 1.1 : 0.9;

    const previous = currentView.current;

    const newScale = Math.min(
      MAX_SCALE,
      Math.max(
        MIN_SCALE,
        previous.scale * factor
      )
    );

    /*
     * Zoom toward cursor.
     */
    const newX =
      cx -
      ((cx - previous.x) / previous.scale) *
        newScale;

    const newY =
      cy -
      ((cy - previous.y) / previous.scale) *
        newScale;

    currentView.current = {
      x: newX,
      y: newY,
      scale: newScale,
    };

    scheduleTransformUpdate();
  }

  /*
   * ------------------------------------------------------------
   * PAN
   * ------------------------------------------------------------
   */

  function handleMouseDown(
    e: React.MouseEvent<SVGSVGElement>
  ) {
    e.preventDefault();

    const view = currentView.current;

    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      viewX: view.x,
      viewY: view.y,
    };

    setHovered(null);
  }

  function handleMouseMove(
    e: React.MouseEvent<SVGSVGElement>
  ) {
    const drag = dragState.current;

    if (!drag || !svgRef.current) {
      return;
    }

    const rect =
      svgRef.current.getBoundingClientRect();

    const dx =
      ((e.clientX - drag.startX) / rect.width) *
      width;

    const dy =
      ((e.clientY - drag.startY) / rect.height) *
      height;

    currentView.current = {
      ...currentView.current,
      x: drag.viewX + dx,
      y: drag.viewY + dy,
    };

    scheduleTransformUpdate();
  }

  function stopDrag() {
    dragState.current = null;
  }

  /*
   * ------------------------------------------------------------
   * CONTROLS
   * ------------------------------------------------------------
   */

  function resetView() {
    currentView.current = {
      x: 0,
      y: 0,
      scale: 1,
    };

    applyTransform();
  }

  function toggleType(type: EdgeType) {
    setVisibleTypes((previous) => {
      const next = new Set(previous);

      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }

      return next;
    });
  }

  /*
   * ------------------------------------------------------------
   * HOVER
   * ------------------------------------------------------------
   */

  function handleNodeEnter(id: string) {
    if (dragState.current) {
      return;
    }

    setHovered(id);
  }

  function handleNodeLeave() {
    if (dragState.current) {
      return;
    }

    setHovered(null);
  }

  /*
   * ------------------------------------------------------------
   * RENDER
   * ------------------------------------------------------------
   */

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* ======================================================
          STICKY ROUND HEADER
          ====================================================== */}

      <div
        className="
          absolute
          top-0
          left-0
          right-0
          z-20
          h-12
          overflow-hidden
          pointer-events-none
        "
      >
        <div
          ref={roundsRef}
          className="absolute top-0 left-0 h-12"
          style={{
            transformOrigin: "0 50%",
            willChange: "transform",
          }}
        >
          {rounds.map((round, index) => (
            <div
              key={`${round.label}-${index}`}
              className="
                absolute
                top-0
                h-12
                flex
                items-center
                justify-center
              "
              style={{
                left: round.x,
                width: 100,
                transform: "translateX(-50%)",
              }}
            >
              <span
                className="
                  text-[7px]
                  tracking-widest
                  text-gray-500
                  whitespace-nowrap
                "
              >
                {round.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================
          GRAPH
          ====================================================== */}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="
          absolute
          inset-0
          w-full
          h-full
          bg-gray-50
        "
        style={{
          touchAction: "none",
          cursor: "grab",
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onDragStart={(e) => e.preventDefault()}
      >
        <g
          ref={groupRef}
          style={{
            willChange: "transform",
          }}
        >
          {/* ==================================================
              EDGES
              ================================================== */}

          {visibleEdges.map((edge, index) => {
            const source = nodeById.get(edge.source);
            const target = nodeById.get(edge.target);

            if (!source || !target) {
              return null;
            }

            const isHighlighted =
              !!hovered &&
              (
                edge.source === hovered ||
                edge.target === hovered
              );

            return (
              <line
                key={`${edge.source}-${edge.target}-${edge.type}-${index}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={EDGE_COLORS[edge.type]}
                strokeWidth={
                  isHighlighted ? 2 : 0.7
                }
                strokeOpacity={
                  hovered
                    ? isHighlighted
                      ? 0.9
                      : 0.05
                    : 0.3
                }
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          {/* ==================================================
              HUBS
              ================================================== */}

          {hubNodes.map((node) => {
            if (
              node.kind !== "hub" ||
              !visibleTypes.has(node.type)
            ) {
              return null;
            }

            const r = node.r - 14;

            const dimmed =
              !!hovered &&
              hovered !== node.id &&
              !connectedIds.has(node.id);

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() =>
                  handleNodeEnter(node.id)
                }
                onMouseLeave={handleNodeLeave}
                style={{
                  cursor: "pointer",
                  opacity: dimmed ? 0.2 : 1,
                }}
              >
                <circle
                  r={r}
                  fill={EDGE_COLORS[node.type]}
                  fillOpacity={0.2}
                  stroke={EDGE_COLORS[node.type]}
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />

                <text
                  y={-r - 6}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#555"
                  fontFamily="ui-monospace, monospace"
                >
                  {node.label}
                </text>
              </g>
            );
          })}

          {/* ==================================================
              IMAGE NODES
              ================================================== */}

          {imageNodes.map((node) => {
            if (node.kind !== "image") {
              return null;
            }

            const isHovered =
              hovered === node.id;

            const dimmed =
              !!hovered &&
              hovered !== node.id &&
              !connectedIds.has(node.id);

            const size = IMG_MAX_DIM;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() =>
                  handleNodeEnter(node.id)
                }
                onMouseLeave={handleNodeLeave}
                style={{
                  cursor: "pointer",
                  opacity: dimmed ? 0.25 : 1,
                }}
              >
                {/*
                 * Don't render/load the actual image
                 * until this node is hovered.
                 */}

                {isHovered ? (
                  <>
                    <image
                      href={node.url}
                      x={-size / 2}
                      y={-size / 2}
                      width={size}
                      height={size}
                      preserveAspectRatio="xMidYMid slice"
                    />

                    <rect
                      x={-size / 2}
                      y={-size / 2}
                      width={size}
                      height={size}
                      fill="none"
                      stroke="#fff"
                      strokeWidth={1.5}
                      vectorEffect="non-scaling-stroke"
                    />
                  </>
                ) : (
                  /*
                   * Cheap star-like placeholder.
                   *
                   * This is deliberately just SVG geometry,
                   * rather than an image.
                   */
                  <path
                    d="
                      M 0 -7
                      L 1.8 -2
                      L 7 0
                      L 1.8 1.8
                      L 0 7
                      L -1.8 1.8
                      L -7 0
                      L -1.8 -2
                      Z
                    "
                    fill="#777"
                    fillOpacity={0.8}
                    stroke="#fff"
                    strokeWidth={0.8}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* ======================================================
          BOTTOM CONTROLS
          ====================================================== */}

      <div className="absolute bottom-5 left-5 z-30">
        {controlsOpen && (
          <div
            className="
              absolute
              bottom-12
              left-0
              w-56
              rounded-lg
              border
              border-white/10
              bg-black/85
              backdrop-blur-md
              shadow-2xl
              p-3
              text-white
            "
          >
            <div
              className="
                text-[10px]
                uppercase
                tracking-widest
                text-gray-500
                mb-3
              "
            >
              Connections
            </div>

            <div className="space-y-2">
              {(
                [
                  "color",
                  "medium",
                  "subject",
                ] as const
              ).map((type) => (
                <label
                  key={type}
                  className="
                    flex
                    items-center
                    gap-2
                    text-xs
                    text-gray-300
                    cursor-pointer
                  "
                >
                  <input
                    type="checkbox"
                    checked={visibleTypes.has(type)}
                    onChange={() =>
                      toggleType(type)
                    }
                    className="accent-white"
                  />

                  <span
                    className="
                      w-2.5
                      h-2.5
                      rounded-full
                      shrink-0
                    "
                    style={{
                      background:
                        EDGE_COLORS[type],
                    }}
                  />

                  <span>{type}</span>
                </label>
              ))}
            </div>

            <div className="h-px bg-white/10 my-3" />

            <button
              onClick={resetView}
              className="
                text-xs
                text-gray-400
                hover:text-white
                transition-colors
              "
            >
              Reset view
            </button>

            <div
              className="
                mt-3
                text-[10px]
                leading-relaxed
                text-gray-600
              "
            >
              Scroll to zoom.
              <br />
              Drag to pan.
              <br />
              Hover a node to explore.
            </div>
          </div>
        )}

        <button
          onClick={() =>
            setControlsOpen(
              (open) => !open
            )
          }
          className="
            w-9
            h-9
            rounded-full
            border
            border-white/15
            bg-black/70
            backdrop-blur-md
            text-gray-400
            hover:text-white
            hover:bg-black/90
            transition-colors
            flex
            items-center
            justify-center
            text-sm
          "
          aria-label="Graph controls"
          aria-expanded={controlsOpen}
        >
          {controlsOpen ? "×" : "N"}
        </button>
      </div>
    </div>
  );
}
