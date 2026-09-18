// lib/star-shape.ts

// Deterministic pseudo-random generator — same seed always produces the
// same jittered shape, so stars look organic but never shift between
// server and client renders or across re-renders.
export function seededRandom(seed: number) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }
  
  // Generates an asymmetric N-pointed star's polygon points, centered at
  // (cx, cy). `jitter` controls how irregular the points are (0 = perfectly
  // even star, higher = more hand-drawn/organic). Used for the decorative
  // motif stars throughout the site.
  export function starPoints(
    cx: number,
    cy: number,
    outerR: number,
    innerR: number,
    points = 6,
    seed = 1,
    jitter = 0.18
  ): string {
    const rand = seededRandom(seed);
    const step = Math.PI / points;
    const coords: string[] = [];
    for (let i = 0; i < points * 2; i++) {
      const angle = -Math.PI / 2 + i * step;
      const baseR = i % 2 === 0 ? outerR : innerR;
      const r = baseR * (1 - jitter / 2 + rand() * jitter);
      const a = angle + (rand() - 0.5) * 0.15;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      coords.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return coords.join(" ");
  }
  
  // A clean, perfectly regular N-pointed star — no jitter — used for chart
  // grids where readability matters more than the hand-drawn look.
  export function regularStarPoints(
    cx: number,
    cy: number,
    outerR: number,
    innerR: number,
    points = 6
  ): string {
    const step = Math.PI / points;
    const coords: string[] = [];
    for (let i = 0; i < points * 2; i++) {
      const angle = -Math.PI / 2 + i * step;
      const r = i % 2 === 0 ? outerR : innerR;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      coords.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return coords.join(" ");
  }
  
  // The angle (radians) of the i-th of `total` evenly spaced axes, starting
  // straight up and going clockwise — used to place radar-chart data points.
  export function axisAngle(index: number, total: number): number {
    return -Math.PI / 2 + (index / total) * Math.PI * 2;
  }
  
  // A small deterministic starfield — scattered background dots for a
  // night-sky feel, seeded so it's stable across renders.
  export function starfield(width: number, height: number, count: number, seed = 99) {
    const rand = seededRandom(seed);
    return Array.from({ length: count }, (_, i) => ({
      x: rand() * width,
      y: rand() * height,
      r: 0.4 + rand() * 1.3,
      opacity: 0.15 + rand() * 0.45,
    }));
  }