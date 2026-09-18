// components/collection-breakdown.tsx
"use client";

import StarRadarChart from "@/components/star-radar-chart";
import type { CollectionSummary, CollectionFilters, FilterField } from "@/lib/quiz";

export default function CollectionBreakdown({
  summary,
  filters,
  onToggle,
  onClear,
  filteredCount,
}: {
  summary: CollectionSummary;
  filters: CollectionFilters;
  onToggle: (field: FilterField, value: string) => void;
  onClear: () => void;
  filteredCount: number;
}) {
  if (summary.total === 0) return null;

  const activeCount = filters.color.size + filters.medium.size + filters.subject.size;

  const fields: { key: FilterField; title: string }[] = [
    { key: "color", title: "Color" },
    { key: "medium", title: "Medium" },
    { key: "subject", title: "Subject matter" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-400">
          {activeCount > 0
            ? `Showing ${filteredCount} of ${summary.total}`
            : "Click a point to filter"}
        </p>
        {activeCount > 0 && (
          <button type="button" onClick={onClear} className="text-xs underline text-gray-400">
            clear
          </button>
        )}
      </div>
      <div className="flex flex-col gap-10">
        {fields.map(({ key, title }) => (
          <StarRadarChart
            key={key}
            title={title}
            data={summary[key].slice(0, 6)}
            selected={filters[key]}
            onToggle={(value) => onToggle(key, value)}
          />
        ))}
      </div>
    </div>
  );
}