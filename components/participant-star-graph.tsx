
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

import { starPoints, starfield } from "@/lib/star-shape";

type CollectionImage = {
  id: string;
  url: string;
  title: string | null;
  artist: string | null;
  date: string | null;
  color: string | null;
  medium: string | null;
  subject_matter: string | null;
};

type CollectionNode = CollectionImage & {
  x: number;
  y: number;
};

type CollectionEdge = {
  source: string;
  target: string;
};

type View = {
  x: number;
  y: number;
  scale: number;
};

const OUTER_R = 25;
const INNER_R = 10;

const MIN_SCALE = 0.35;
const MAX_SCALE = 3;
const ZOOM_SENSITIVITY = 0.0015;

const SVG_WIDTH = 1400;
const SVG_HEIGHT = 850;

const CLIP_ID = "participant-collection-star-clip";

function seededValue(seed: string) {
  let value = 0;

  for (let i = 0; i < seed.length; i++) {
    value = (value * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return (value % 10000) / 10000;
}

function sharedFields(
  a: CollectionImage,
  b: CollectionImage
): string[] {
  const matches: string[] = [];

  if (
    a.color &&
    b.color &&
    a.color.toLowerCase() === b.color.toLowerCase()
  ) {
    matches.push("Color");
  }

  if (
    a.medium &&
    b.medium &&
    a.medium.toLowerCase() === b.medium.toLowerCase()
  ) {
    matches.push("Medium");
  }

  if (
    a.subject_matter &&
    b.subject_matter &&
    a.subject_matter.toLowerCase() === b.subject_matter.toLowerCase()
  ) {
    matches.push("Subject");
  }

  return matches;
}

function buildLayout(images: CollectionImage[]) {
  const columns = Math.max(3, Math.ceil(Math.sqrt(images.length)));
  const rows = Math.max(1, Math.ceil(images.length / columns));

  const horizontalGap = 155;
  const verticalGap = 145;

  const nodes: CollectionNode[] = images.map((image, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);

    const jitterX = (seededValue(`${image.id}-x`) - 0.5) * 65;
    const jitterY = (seededValue(`${image.id}-y`) - 0.5) * 55;

    return {
      ...image,
      x:
        150 +
        column * horizontalGap +
        jitterX,
      y:
        115 +
        row * verticalGap +
        jitterY,
    };
  });

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  const edges: CollectionEdge[] = [];

  for (let i = 0; i < images.length; i++) {
    for (let j = i + 1; j < images.length; j++) {
      const matches = sharedFields(images[i], images[j]);

      if (matches.length > 0) {
        edges.push({
          source: images[i].id,
          target: images[j].id,
        });
      }
    }
  }

  const width = Math.max(
    SVG_WIDTH,
    300 + columns * horizontalGap
  );

  const height = Math.max(
    SVG_HEIGHT,
    220 + rows * verticalGap
  );

  return {
    nodes,
    edges,
    nodeMap,
    width,
    height,
  };
}

function StarGlyph({
  node,
  hovered,
  onEnter,
  onLeave,
}: {
  node: CollectionNode;
  hovered: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const points = starPoints(node.x, node.y, OUTER_R, INNER_R);

  return (
    <g
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ cursor: "pointer" }}
    >
      <polygon
        points={points}
        fill={hovered ? "#ffffff" : "#d8d8d8"}
        stroke={hovered ? "#ffffff" : "#8d8d8d"}
        strokeWidth={hovered ? 2 : 1}
        opacity={hovered ? 1 : 0.95}
      />

      <image
        href={node.url}
        x={node.x - OUTER_R}
        y={node.y - OUTER_R}
        width={OUTER_R * 2}
        height={OUTER_R * 2}
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${CLIP_ID})`}
        opacity={hovered ? 1 : 0.9}
        pointerEvents="none"
      />

      {hovered && (
        <circle
          cx={node.x}
          cy={node.y}
          r={OUTER_R + 7}
          fill="none"
          stroke="#ffffff"
          strokeWidth={1}
          opacity={0.7}
        />
      )}
    </g>
  );
}

function BackgroundStars({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const stars = useMemo(
    () => starfield(Math.ceil((width * height) / 15000), width, height),
    [width, height]
  );

  return (
    <g pointerEvents="none">
      {stars.map((star, index) => (
        <circle
          key={index}
          cx={star.x}
          cy={star.y}
          r={star.r}
          fill="white"
          opacity={star.opacity}
        />
      ))}
    </g>
  );
}

export default function ParticipantStarGraph({
  images,
}: {
  images: CollectionImage[];
}) {
  const layout = useMemo(() => buildLayout(images), [images]);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [view, setView] = useState<View>({
    x: 0,
    y: 0,
    scale: 1,
  });

  const [viewport, setViewport] = useState({
    width: 1000,
    height: 650,
  });

  const svgRef = useRef<SVGSVGElement | null>(null);

  const draggingRef = useRef(false);
  const dragStartRef = useRef({
    x: 0,
    y: 0,
  });

  const viewStartRef = useRef<View>({
    x: 0,
    y: 0,
    scale: 1,
  });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      setViewport({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(svg);

    return () => observer.disconnect();
  }, []);

  const resetView = useCallback(() => {
    setView({
      x: 0,
      y: 0,
      scale: 1,
    });
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (event.button !== 0) return;

      draggingRef.current = true;

      dragStartRef.current = {
        x: event.clientX,
        y: event.clientY,
      };

      viewStartRef.current = view;

      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [view]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (!draggingRef.current) return;

      const dx = event.clientX - dragStartRef.current.x;
      const dy = event.clientY - dragStartRef.current.y;

      setView({
        ...viewStartRef.current,
        x: viewStartRef.current.x + dx,
        y: viewStartRef.current.y + dy,
      });
    },
    []
  );

  const stopDragging = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      draggingRef.current = false;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    []
  );

  const handleWheel = useCallback(
    (event: ReactWheelEvent<SVGSVGElement>) => {
      event.preventDefault();

      const rect = event.currentTarget.getBoundingClientRect();

      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const direction = event.deltaY > 0 ? -1 : 1;
      const nextScale = Math.min(
        MAX_SCALE,
        Math.max(
          MIN_SCALE,
          view.scale *
            Math.exp(direction * Math.abs(event.deltaY) * ZOOM_SENSITIVITY)
        )
      );

      const scaleRatio = nextScale / view.scale;

      const nextX =
        mouseX - (mouseX - view.x) * scaleRatio;

      const nextY =
        mouseY - (mouseY - view.y) * scaleRatio;

      setView({
        x: nextX,
        y: nextY,
        scale: nextScale,
      });
    },
    [view]
  );

  const hoveredNode = hoveredId
    ? layout.nodeMap.get(hoveredId) ?? null
    : null;

  const connectedIds = useMemo(() => {
    if (!hoveredId) return new Set<string>();

    const connected = new Set<string>();

    for (const edge of layout.edges) {
      if (edge.source === hoveredId) connected.add(edge.target);
      if (edge.target === hoveredId) connected.add(edge.source);
    }

    return connected;
  }, [hoveredId, layout.edges]);

  const hoveredConnections = hoveredNode
    ? images
        .filter((image) => image.id !== hoveredNode.id)
        .map((image) => ({
          image,
          fields: sharedFields(hoveredNode, image),
        }))
        .filter((item) => item.fields.length > 0)
    : [];

  return (
    <div className="relative h-full min-h-[520px] w-full overflow-hidden bg-[#050505] text-white">
      <svg
        ref={svgRef}
        className="absolute inset-0 h-full w-full touch-none select-none"
        viewBox={`0 0 ${viewport.width} ${viewport.height}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onWheel={handleWheel}
      >
        <defs>
          <clipPath id={CLIP_ID}>
            <polygon
              points={starPoints(OUTER_R, OUTER_R, OUTER_R, INNER_R)}
              transform={`translate(${-OUTER_R}, ${-OUTER_R})`}
            />
          </clipPath>

          <filter id="participant-star-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g
          transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}
        >
          <rect
            x={-10000}
            y={-10000}
            width={30000}
            height={30000}
            fill="#050505"
          />

          <BackgroundStars
            width={layout.width}
            height={layout.height}
          />

          <g opacity={hoveredId ? 0.16 : 0.45}>
            {layout.edges.map((edge, index) => {
              const source = layout.nodeMap.get(edge.source);
              const target = layout.nodeMap.get(edge.target);

              if (!source || !target) return null;

              const isHighlighted =
                hoveredId === edge.source ||
                hoveredId === edge.target;

              return (
                <line
                  key={`${edge.source}-${edge.target}-${index}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={isHighlighted ? "#ffffff" : "#777777"}
                  strokeWidth={isHighlighted ? 1.5 : 0.7}
                  opacity={isHighlighted ? 1 : 0.55}
                  filter={
                    isHighlighted
                      ? "url(#participant-star-glow)"
                      : undefined
                  }
                />
              );
            })}
          </g>

          {layout.nodes.map((node) => {
            const isHovered = hoveredId === node.id;
            const isConnected = connectedIds.has(node.id);

            return (
              <g
                key={node.id}
                opacity={
                  hoveredId && !isHovered && !isConnected
                    ? 0.2
                    : 1
                }
              >
                <StarGlyph
                  node={node}
                  hovered={isHovered}
                  onEnter={() => setHoveredId(node.id)}
                  onLeave={() => setHoveredId(null)}
                />
              </g>
            );
          })}
        </g>
      </svg>

      <div className="pointer-events-none absolute left-4 top-4">
        <p className="text-[10px] uppercase tracking-[0.24em] text-white/50">
          collection star chart
        </p>
        <p className="mt-1 text-xs text-white/35">
          drag to pan · scroll to zoom · hover a star
        </p>
      </div>

      <div className="absolute bottom-4 left-4 flex items-center gap-2">
        <button
          type="button"
          onClick={resetView}
          className="border border-white/20 bg-black/60 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white/65 transition hover:border-white/50 hover:text-white"
        >
          reset view
        </button>

        <span className="border border-white/10 bg-black/50 px-3 py-1.5 text-[10px] text-white/40">
          {images.length} stars
        </span>
      </div>

      {hoveredNode && (
        <aside className="absolute right-0 top-0 h-full w-[280px] max-w-[82vw] overflow-y-auto border-l border-white/10 bg-black/85 p-5 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setHoveredId(null)}
            className="mb-5 text-[10px] uppercase tracking-[0.16em] text-white/40 hover:text-white"
          >
            close
          </button>

          <img
            src={hoveredNode.url}
            alt={hoveredNode.title ?? ""}
            className="mb-4 aspect-square w-full object-cover"
          />

          <h2 className="text-sm font-medium text-white">
            {hoveredNode.title || "Untitled"}
          </h2>

          {hoveredNode.artist && (
            <p className="mt-1 text-xs text-white/55">
              {hoveredNode.artist}
            </p>
          )}

          {hoveredNode.date && (
            <p className="mt-1 text-xs text-white/40">
              {hoveredNode.date}
            </p>
          )}

          <div className="mt-5 space-y-2 border-t border-white/10 pt-4">
            {hoveredNode.medium && (
              <div>
                <p className="text-[9px] uppercase tracking-[0.16em] text-white/35">
                  medium
                </p>
                <p className="text-xs text-white/65">
                  {hoveredNode.medium}
                </p>
              </div>
            )}

            {hoveredNode.color && (
              <div>
                <p className="text-[9px] uppercase tracking-[0.16em] text-white/35">
                  color
                </p>
                <p className="text-xs text-white/65">
                  {hoveredNode.color}
                </p>
              </div>
            )}

            {hoveredNode.subject_matter && (
              <div>
                <p className="text-[9px] uppercase tracking-[0.16em] text-white/35">
                  subject
                </p>
                <p className="text-xs text-white/65">
                  {hoveredNode.subject_matter}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="text-[9px] uppercase tracking-[0.16em] text-white/35">
              connected works
            </p>

            {hoveredConnections.length === 0 ? (
              <p className="mt-2 text-xs text-white/35">
                No shared attributes with another selected work.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {hoveredConnections.map(({ image, fields }) => (
                  <div
                    key={image.id}
                    className="flex gap-2"
                  >
                    <img
                      src={image.url}
                      alt={image.title ?? ""}
                      className="h-10 w-10 shrink-0 object-cover"
                    />

                    <div className="min-w-0">
                      <p className="truncate text-xs text-white/70">
                        {image.title || "Untitled"}
                      </p>
                      <p className="text-[10px] text-white/35">
                        {fields.join(" · ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

