// lib/quiz-graph.ts

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
  
  export function layoutQuizSession(session: QuizSession): QuizGraphLayout {
    const rounds = session.rounds;
    const maxPerColumn = Math.max(...rounds.map((r) => r.images.length), 1);
    const height = PAD * 2 + maxPerColumn * CELL_H;
  
    const nodes: QuizNode[] = [];
    const chosenSet = new Set<string>();
    rounds.forEach((r) => r.chosenIds.forEach((id) => chosenSet.add(id)));
  
    rounds.forEach((r, colIndex) => {
      const colHeight = r.images.length * CELL_H;
      const startY = height / 2 - colHeight / 2 + CELL_H / 2;
      const x = PAD + colIndex * COL_W;
      r.images.forEach((img, i) => {
        nodes.push({
          ...img,
          round: r.round,
          chosen: chosenSet.has(img.id),
          x,
          y: startY + i * CELL_H,
        });
      });
    });
  
    const edges: QuizEdge[] = [];
    for (let i = 0; i < rounds.length - 1; i++) {
      const from = rounds[i];
      const to = rounds[i + 1];
      if (from.basisIds.length === 0) continue;
      for (const sourceId of from.basisIds) {
        for (const img of to.images) {
          edges.push({ source: sourceId, target: img.id });
        }
      }
    }
  
    const width = PAD * 2 + Math.max(rounds.length - 1, 0) * COL_W;
  
    return { nodes, edges, width, height };
  }
  
  // Explains why an edge exists: which fields the two endpoint images share.
  // This is a real, literal answer — pickSimilarNine scores candidates by
  // exactly this count of shared color/medium/subject matches against the
  // chosen "basis" images, so this is the actual mechanism, not a guess.
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