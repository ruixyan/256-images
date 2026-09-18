// components/star-radar-chart.tsx
"use client";

import { regularStarPoints } from "@/lib/star-shape";

type DatumPoint = { value: string; count: number };

const ICON_BOX = 26;   // fixed icon slot every row aligns to
const MIN_STAR = 10;   // smallest star's diameter
const MAX_STAR = 24;   // largest star's diameter (the most common value)

export default function StarRadarChart({
  title,
  data,
  selected,
  onToggle,
}: {
  title: string;
  data: DatumPoint[];
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  if (data.length === 0) {
    return (
      <div>
        <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">{title}</h3>
        <p className="text-xs text-gray-300">No data</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">{title}</h3>
      <ul className="space-y-1.5">
        {data.map((d) => {
          const diameter = MIN_STAR + (d.count / maxCount) * (MAX_STAR - MIN_STAR);
          const isSelected = selected.has(d.value);
          return (
            <li key={d.value}>
              <button
                type="button"
                onClick={() => onToggle(d.value)}
                className="flex items-center gap-3 w-full text-left"
              >
                <svg width={ICON_BOX} height={ICON_BOX} viewBox={`0 0 ${ICON_BOX} ${ICON_BOX}`} className="shrink-0">
                  <polygon
                    points={regularStarPoints(ICON_BOX / 2, ICON_BOX / 2, diameter / 2, diameter * 0.21, 6)}
                    fill="#ffffff"
                    fillOpacity={isSelected ? 1 : 0.5}
                    stroke={isSelected ? "#16a34a" : "none"}
                    strokeWidth={1.5}
                  />
                </svg>
                <span className={`text-xs flex-1 truncate ${isSelected ? "text-white" : "text-gray-300"}`}>
                  {d.value}
                </span>
                <span className="text-xs text-gray-500">{d.count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}