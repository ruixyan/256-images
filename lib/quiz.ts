// lib/quiz.ts
import { getMostPopularCombo, type ImageInput } from "@/lib/graph-layout";

function fieldsOf(img: ImageInput) {
  return {
    color: img.color?.trim().toLowerCase() || null,
    medium: img.medium?.trim().toLowerCase() || null,
    subject: img.subject_matter?.trim().toLowerCase() || null,
  };
}

// Round 1: the images matching the single most popular color, medium, and
// subject matter (widening to top-2, top-3, etc. of each until 9 qualify —
// see getMostPopularCombo in graph-layout.ts for that widening logic).
export function pickStartingNine(images: ImageInput[], count = 9): ImageInput[] {
  return getMostPopularCombo(images, count).map((m) => m.image);
}

// Every round after the first: scores each remaining pool image by how many
// fields (color/medium/subject) it shares with any image in `basis`, summed
// across all basis images, then returns the top `count`. Unlike round 1,
// this does NOT require an image to have all three fields filled in —
// partial matches still count, they just score lower.
export function pickSimilarNine(pool: ImageInput[], basis: ImageInput[], count = 9): ImageInput[] {
  if (pool.length === 0 || basis.length === 0) return pool.slice(0, count);

  const basisFields = basis.map(fieldsOf);
  const scored = pool.map((img) => {
    const f = fieldsOf(img);
    let score = 0;
    for (const b of basisFields) {
      if (f.color && f.color === b.color) score += 1;
      if (f.medium && f.medium === b.medium) score += 1;
      if (f.subject && f.subject === b.subject) score += 1;
    }
    return { img, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map((s) => s.img);
}

export type FieldBreakdown = { value: string; count: number }[];

export type CollectionSummary = {
  total: number;
  color: FieldBreakdown;
  medium: FieldBreakdown;
  subject: FieldBreakdown;
  artist: FieldBreakdown;
};

function tally<T extends ImageInput>(
  images: T[],
  get: (i: T) => string | null | undefined
): FieldBreakdown {
  const counts = new Map<string, number>();
  for (const img of images) {
    const raw = get(img)?.trim();
    if (!raw) continue;
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

export function summarizeCollection<T extends ImageInput & { artist?: string | null }>(
  images: T[]
): CollectionSummary {
  return {
    total: images.length,
    color: tally(images, (i) => i.color),
    medium: tally(images, (i) => i.medium),
    subject: tally(images, (i) => i.subject_matter),
    artist: tally(images, (i) => i.artist),
  };
}

export type FilterField = "color" | "medium" | "subject" | "artist";

export type CollectionFilters = {
  color: Set<string>;
  medium: Set<string>;
  subject: Set<string>;
  artist: Set<string>;
};

export function emptyFilters(): CollectionFilters {
  return { color: new Set(), medium: new Set(), subject: new Set(), artist: new Set() };
}

// Values selected within the same field are OR'd together (e.g. color=blue
// OR color=red); fields that have at least one selection are AND'd against
// each other (e.g. must match one of the selected colors AND one of the
// selected mediums). A field with no selections imposes no constraint.
export function applyFilters<T extends ImageInput & { artist?: string | null }>(
  images: T[],
  filters: CollectionFilters
): T[] {
  return images.filter((img) => {
    const c = img.color?.trim();
    const m = img.medium?.trim();
    const s = img.subject_matter?.trim();
    const a = img.artist?.trim();
    if (filters.color.size > 0 && (!c || !filters.color.has(c))) return false;
    if (filters.medium.size > 0 && (!m || !filters.medium.has(m))) return false;
    if (filters.subject.size > 0 && (!s || !filters.subject.has(s))) return false;
    if (filters.artist.size > 0 && (!a || !filters.artist.has(a))) return false;
    return true;
  });
}

export function totalActiveFilters(filters: CollectionFilters): number {
  return filters.color.size + filters.medium.size + filters.subject.size + filters.artist.size;
}