// components/fit-grid.tsx
"use client";

import { useEffect, useRef, useState } from "react";

type GridImage = { id: string; url: string; title: string | null };

// Picks the column count that best fills the container without needing to
// scroll — tries every possible column count for the given item count and
// keeps whichever yields the largest cell size that still fits both axes.
function bestLayout(n: number, containerW: number, containerH: number) {
  let best = { cols: 1, cellSize: 0 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const cellW = containerW / cols;
    const cellH = containerH / rows;
    const cellSize = Math.min(cellW, cellH);
    if (cellSize > best.cellSize) best = { cols, cellSize };
  }
  return best;
}

export default function FitGrid({ images }: { images: GridImage[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ cols: 1, cellSize: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el || images.length === 0) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setLayout(bestLayout(images.length, width, height));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [images.length]);

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${layout.cols}, ${layout.cellSize}px)` }}
      >
        {images.map((img) => (
          <div key={img.id} style={{ width: layout.cellSize, height: layout.cellSize }}>
            <img
              src={img.url}
              alt={img.title ?? ""}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}