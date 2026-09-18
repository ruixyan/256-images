// lib/quiz-graph.ts
import { seededRandom } from "@/lib/star-shape";

export type StoredQuizImage = {
  id: string;
  url: string;
  title: string | null;
  artist: string | null;
  date: string | null;
  color: string | null;
  medium: string | null;
  subject_matter: string | null;
};

export type StoredQuizRound = {
  round: number;
  images: StoredQuizImage[];
  chosenIds: string[];
  basisIds: string[];
};

export type QuizSession = { rounds: StoredQuizRound[] };

export const QUIZ_SESSION_KEY = "quizSession";

export function saveQuizSession(session: QuizSession) {
  try {
    sessionStorage.setItem(QUIZ_SESSION_KEY, JSON.stringify(session));
  } catch {
    // non-fatal — connections page just won't have quiz-mode data
  }
}

export function loadQuizSession(): QuizSession | null {
  try {
    const raw = sessionStorage.getItem(QUIZ_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.rounds?.length) return null;
    return parsed as QuizSession;
  } catch {
    return null;
  }
}

export function isQuizCompleted(session: QuizSession | null): boolean {
  if (!session || session.rounds.length === 0) return false;
  const last = session.rounds[session.rounds.length - 1];
  return last.basisIds.length === 0;
}

export type QuizNode = StoredQuizImage & {
  round: number;
  chosen: boolean;
  x: number;
  y: number;
};

export type QuizEdge = { source: string; target: string };

export type QuizGraphLayout = {
  nodes: QuizNode[];
  edges: QuizEdge[];
  width: number;
  height: number;
};

const COL_W = 190;
const CELL_H = 130;
const PAD = 90;
const JITTER_X = 50;
const JITTER_Y = 50;

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100000;
  return h + 1;
}

// Two images "share a field" if they have the same non-empty color, medium,
// or subject matter (case/whitespace-insensitive). This is the actual
// mechanism pickSimilarNine's scoring is built on, so it's also the honest
// basis for whether a connecting line between two specific images means
// anything — rather than drawing a line for every basis→next-round pair
// regardless of whether they're actually related.
function imagesShareField(a: StoredQuizImage, b: StoredQuizImage): boolean {
  const norm = (v: string | null) => v?.trim().toLowerCase() || null;
  const ac = norm(a.color), bc = norm(b.color);
  const am = norm(a.medium), bm = norm(b.medium);
  const as = norm(a.subject_matter), bs = norm(b.subject_matter);
  return (!!ac && ac === bc) || (!!am && am === bm) || (!!as && as === bs);
}

export function layoutQuizSession(session: QuizSession): QuizGraphLayout {
  const rounds = session.rounds;
  if (rounds.length === 0) return { nodes: [], edges: [], width: 400, height: 300 };

  const maxPerColumn = Math.max(...rounds.map((r) => r.images.length), 1);
  const nominalHeight = maxPerColumn * CELL_H;

  const chosenSet = new Set<string>();
  rounds.forEach((r) => r.chosenIds.forEach((id) => chosenSet.add(id)));

  const raw: QuizNode[] = [];
  const imageById = new Map<string, StoredQuizImage>();
  rounds.forEach((r) => r.images.forEach((img) => imageById.set(img.id, img)));

  rounds.forEach((r, colIndex) => {
    const colHeight = r.images.length * CELL_H;
    const startY = nominalHeight / 2 - colHeight / 2 + CELL_H / 2;
    const baseX = colIndex * COL_W;
    r.images.forEach((img, i) => {
      const rand = seededRandom(hashSeed(img.id));
      const jitterX = (rand() - 0.5) * JITTER_X;
      const jitterY = (rand() - 0.5) * JITTER_Y;
      raw.push({
        ...img,
        round: r.round,
        chosen: chosenSet.has(img.id),
        x: baseX + jitterX,
        y: startY + i * CELL_H + jitterY,
      });
    });
  });

  const edges: QuizEdge[] = [];
  for (let i = 0; i < rounds.length - 1; i++) {
    const from = rounds[i];
    const to = rounds[i + 1];
    if (from.basisIds.length === 0) continue;
    for (const sourceId of from.basisIds) {
      const sourceImg = imageById.get(sourceId);
      if (!sourceImg) continue;
      for (const img of to.images) {
        if (imagesShareField(sourceImg, img)) {
          edges.push({ source: sourceId, target: img.id });
        }
      }
    }
  }

  const xs = raw.map((n) => n.x);
  const ys = raw.map((n) => n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  const nodes = raw.map((n) => ({
    ...n,
    x: n.x - minX + PAD,
    y: n.y - minY + PAD,
  }));

  return {
    nodes,
    edges,
    width: (maxX - minX) + PAD * 2,
    height: (maxY - minY) + PAD * 2,
  };
}

export function sharedFields(a: QuizNode, b: QuizNode): { field: string; value: string }[] {
  const shared: { field: string; value: string }[] = [];
  if (a.color && b.color && a.color.trim().toLowerCase() === b.color.trim().toLowerCase()) {
    shared.push({ field: "Color", value: a.color });
  }
  if (a.medium && b.medium && a.medium.trim().toLowerCase() === b.medium.trim().toLowerCase()) {
    shared.push({ field: "Medium", value: a.medium });
  }
  if (
    a.subject_matter &&
    b.subject_matter &&
    a.subject_matter.trim().toLowerCase() === b.subject_matter.trim().toLowerCase()
  ) {
    shared.push({ field: "Subject", value: a.subject_matter });
  }
  return shared;
}