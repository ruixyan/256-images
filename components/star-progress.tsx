// components/star-progress.tsx
"use client";

import { starPoints, seededRandom } from "@/lib/star-shape";

export default function StarProgress({
  totalRounds,
  currentRound,
}: {
  totalRounds: number;
  currentRound: number; // 1-indexed
}) {
  if (totalRounds <= 0) return null;

  const width = 280;
  const height = 56;
  const margin = 20;
  const spacing = totalRounds > 1 ? (width - margin * 2) / (totalRounds - 1) : 0;
  const baseY = height / 2;
  const jitterRange = 10;

  const jitter = seededRandom(11);
  const positions = Array.from({ length: totalRounds }, (_, i) => ({
    x: totalRounds > 1 ? margin + i * spacing : width / 2,
    y: baseY + (jitter() - 0.5) * jitterRange,
    round: i + 1,
  }));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <defs>
        <filter id="star-progress-rough" x="-60%" y="-60%" width="220%" height="220%">
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>

      {positions.slice(0, -1).map((p, i) => {
        const next = positions[i + 1];
        const done = p.round < currentRound;
        return (
          <line
            key={i}
            x1={p.x} y1={p.y} x2={next.x} y2={next.y}
            stroke="#ffffff"
            strokeWidth={done ? 0.9 : 0.5}
            strokeOpacity={done ? 0.7 : 0.25}
          />
        );
      })}

      {positions.map((p) => {
        const isDone = p.round < currentRound;
        const isCurrent = p.round === currentRound;
        const isReached = isDone || isCurrent;
        const outerR = isCurrent ? 6.5 : 5;
        const innerR = outerR * 0.42;
        const fill = isReached ? "#ffffff" : "#000000";
        const stroke = isReached ? "#ffffff" : "#71717a";
        return (
          <polygon
            key={p.round}
            filter="url(#star-progress-rough)"
            points={starPoints(p.x, p.y, outerR, innerR, 6, p.round * 17 + 3)}
            fill={fill}
            fillOpacity={isCurrent ? 0.9 : 1}
            stroke={stroke}
            strokeWidth={isCurrent ? 0.8 : 0.5}
          >
            {isCurrent && (
              <animate attributeName="fill-opacity" values="0.9;0.35;0.9" dur="1.6s" repeatCount="indefinite" />
            )}
          </polygon>
        );
      })}
    </svg>
  );
}