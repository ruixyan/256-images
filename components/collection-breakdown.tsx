// components/collection-breakdown.tsx
"use client";

import type { CollectionSummary, FieldBreakdown, CollectionFilters, FilterField } from "@/lib/quiz";

function FieldColumn({
  title,
  field,
  data,
  total,
  selected,
  onToggle,
}: {
  title: string;
  field: FilterField;
  data: FieldBreakdown;
  total: number;
  selected: Set<string>;
  onToggle: (field: FilterField, value: string) => void;
}) {
  if (data.length === 0) {
    return (
      <div>
        <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">{title}</h3>
        <p className="text-xs text-gray-300">No data</p>
      </div>
    );
  }
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">{title}</h3>
      <ul className="space-y-1.5">
        {data.map(({ value, count }) => {
          const isActive = selected.has(value);
          return (
            <li key={value}>
              <button
                type="button"
                onClick={() => onToggle(field, value)}
                className={`w-full text-left text-xs rounded px-1 -mx-1 ${
                  isActive ? "bg-black text-white" : "hover:bg-gray-100"
                }`}
              >
                <div className="flex justify-between mb-0.5">
                  <span className="capitalize">{value}</span>
                  <span className={isActive ? "text-gray-300" : "text-gray-400"}>{count}</span>
                </div>
                <div className={`h-1 rounded ${isActive ? "bg-white/30" : "bg-gray-100"}`}>
                  <div
                    className={`h-1 rounded ${isActive ? "bg-white" : "bg-black"}`}
                    style={{ width: `${(count / total) * 100}%` }}
                  />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

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

  const activeCount =
    filters.color.size + filters.medium.size + filters.subject.size + filters.artist.size;

  return (
    <div className="border rounded p-4 mb-8">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-400">
          {activeCount > 0
            ? `Showing ${filteredCount} of ${summary.total} — click a value to filter`
            : "Click a value below to filter your collection"}
        </p>
        {activeCount > 0 && (
          <button type="button" onClick={onClear} className="text-xs underline text-gray-400">
            clear filters
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <FieldColumn title="Color" field="color" data={summary.color} total={summary.total} selected={filters.color} onToggle={onToggle} />
        <FieldColumn title="Medium" field="medium" data={summary.medium} total={summary.total} selected={filters.medium} onToggle={onToggle} />
        <FieldColumn title="Subject matter" field="subject" data={summary.subject} total={summary.total} selected={filters.subject} onToggle={onToggle} />
      </div>
    </div>
  );
}