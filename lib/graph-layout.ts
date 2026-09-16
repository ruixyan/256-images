// lib/graph-layout.ts

export type ImageInput = {
    id: string;
    url: string;
    title: string | null;
    color: string | null;
    medium: string | null;
    subject_matter: string | null;
  };
  
  export type EdgeType = "color" | "medium" | "subject";
  
  export type GraphNode =
    | { kind: "image"; id: string; url: string; title: string | null }
    | { kind: "hub"; id: string; type: EdgeType; label: string; size: number };
  
  export type GraphEdge = {
    source: string;
    target: string;
    type: EdgeType;
  };
  
  export type PositionedNode = GraphNode & { x: number; y: number; r: number };
  
  export type LayoutResult = {
    nodes: PositionedNode[];
    width: number;
    height: number;
  };
  
  const FIELDS: { key: EdgeType; get: (img: ImageInput) => string | null }[] = [
    { key: "color", get: (i) => i.color },
    { key: "medium", get: (i) => i.medium },
    { key: "subject", get: (i) => i.subject_matter },
  ];
  
  export function buildGraph(images: ImageInput[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const nodes: GraphNode[] = images.map((img) => ({
      kind: "image",
      id: img.id,
      url: img.url,
      title: img.title,
    }));
    const edges: GraphEdge[] = [];
  
    for (const field of FIELDS) {
      const groups = new Map<string, string[]>();
      for (const img of images) {
        const value = field.get(img)?.trim();
        if (!value) continue;
        const key = value.toLowerCase();
        const list = groups.get(key) ?? [];
        list.push(img.id);
        groups.set(key, list);
      }
      for (const [key, ids] of groups) {
        if (ids.length < 2) continue;
        const hubId = `${field.key}:${key}`;
        nodes.push({ kind: "hub", id: hubId, type: field.key, label: key, size: ids.length });
        for (const imgId of ids) {
          edges.push({ source: imgId, target: hubId, type: field.key });
        }
      }
    }
  
    return { nodes, edges };
  }
  
  const IMAGE_RADIUS = 50;
  const HUB_BASE_RADIUS = 4;
  const COLLIDE_MARGIN = 24;
  
  // Wider than tall, so the graph reads as a horizontal spread across the
  // screen. >1 means width > height.
  const ASPECT_RATIO = 1.7;
  
  // How airy the layout feels — this is the main "spread amount" dial.
  // Roughly: each node claims this many times its own footprint in open space.
  // Raise for more air between nodes, lower to tighten it back up.
  const PACKING_FACTOR = 2.4;
  
  function nodeRadius(node: GraphNode): number {
    if (node.kind === "hub") return HUB_BASE_RADIUS + Math.min(node.size, 12) + 14;
    return IMAGE_RADIUS;
  }
  
  // Force-directed layout (Fruchterman-Reingold) followed by a dedicated
  // overlap-resolution pass. k (the natural node-to-node spacing the physics
  // settles toward) is held roughly CONSTANT per node rather than growing with
  // the total node count — so adding more images makes the canvas bigger, not
  // each gap wider.
  export function layoutGraph(
    nodes: GraphNode[],
    edges: GraphEdge[],
    iterations = 500
  ): LayoutResult {
    const n = nodes.length;
    if (n === 0) return { nodes: [], width: 800, height: 600 };
  
    const cell = IMAGE_RADIUS * 2 + COLLIDE_MARGIN; // target footprint per node
    const area = n * cell * cell * PACKING_FACTOR;
    const seedWidth = Math.sqrt(area * ASPECT_RATIO);
    const seedHeight = area / seedWidth;
  
    const k = Math.sqrt(area / n); // stays roughly constant regardless of n
    const repulsion = k * k;
    const attraction = 1 / k;
  
    const pos = new Map<string, { x: number; y: number }>();
    nodes.forEach((node) => {
      pos.set(node.id, {
        x: (Math.random() - 0.5) * seedWidth,
        y: (Math.random() - 0.5) * seedHeight,
      });
    });
  
    for (let iter = 0; iter < iterations; iter++) {
      const disp = new Map<string, { x: number; y: number }>();
      nodes.forEach((node) => disp.set(node.id, { x: 0, y: 0 }));
  
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const a = pos.get(nodes[i].id)!;
          const b = pos.get(nodes[j].id)!;
          let dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const force = repulsion / dist;
          dx = (dx / dist) * force; dy = (dy / dist) * force;
          disp.get(nodes[i].id)!.x += dx; disp.get(nodes[i].id)!.y += dy;
          disp.get(nodes[j].id)!.x -= dx; disp.get(nodes[j].id)!.y -= dy;
        }
      }
  
      for (const edge of edges) {
        const a = pos.get(edge.source), b = pos.get(edge.target);
        if (!a || !b) continue;
        let dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const force = (dist * dist) * attraction;
        dx = (dx / dist) * force; dy = (dy / dist) * force;
        disp.get(edge.source)!.x -= dx; disp.get(edge.source)!.y -= dy;
        disp.get(edge.target)!.x += dx; disp.get(edge.target)!.y += dy;
      }
  
      const temp = Math.max(0.5, 14 * (1 - iter / iterations));
      nodes.forEach((node) => {
        const p = pos.get(node.id)!;
        const d = disp.get(node.id)!;
        const dist = Math.sqrt(d.x * d.x + d.y * d.y) || 0.01;
        p.x += (d.x / dist) * Math.min(dist, temp);
        p.y += (d.y / dist) * Math.min(dist, temp);
        // pull each node gently toward a horizontally-elongated ellipse rather
        // than a circle — stronger vertical centering, weaker horizontal,
        // reinforcing the horizontal spread over many iterations
        p.x -= (p.x / (seedWidth * 0.6)) * 0.15;
        p.y -= (p.y / (seedHeight * 0.6)) * 0.6;
      });
    }
  
    // Overlap resolution: guarantee no two nodes end up closer than the sum of
    // their radii plus a margin, regardless of what the force step produced.
    const radius = new Map(nodes.map((n) => [n.id, nodeRadius(n)]));
    for (let pass = 0; pass < 300; pass++) {
      let moved = false;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const a = pos.get(nodes[i].id)!;
          const b = pos.get(nodes[j].id)!;
          const minDist = radius.get(nodes[i].id)! + radius.get(nodes[j].id)! + COLLIDE_MARGIN;
          let dx = a.x - b.x, dy = a.y - b.y;
          let dist = Math.sqrt(dx * dx + dy * dy);
          if (dist === 0) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; dist = 0.01; }
          if (dist < minDist) {
            moved = true;
            const push = (minDist - dist) / 2;
            dx = (dx / dist) * push; dy = (dy / dist) * push;
            a.x += dx; a.y += dy;
            b.x -= dx; b.y -= dy;
          }
        }
      }
      if (!moved) break;
    }
  
    const xs = [...pos.values()].map((p) => p.x);
    const ys = [...pos.values()].map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const pad = 80;
  
    const positioned = nodes.map((node) => {
      const p = pos.get(node.id)!;
      return {
        ...node,
        x: pad + (p.x - minX),
        y: pad + (p.y - minY),
        r: radius.get(node.id)!,
      };
    });
  
    return {
      nodes: positioned,
      width: (maxX - minX) + pad * 2,
      height: (maxY - minY) + pad * 2,
    };
  }

  // lib/graph-layout.ts — add alongside buildGraph/layoutGraph

// lib/graph-layout.ts — replaces getMostConnected

export type PopularMatch = {
    image: ImageInput;
    colorRank: number;   // 0 = the single most common color, 1 = second most common, etc.
    mediumRank: number;
    subjectRank: number;
  };
  
  function rankedValues(images: ImageInput[], get: (i: ImageInput) => string | null): string[] {
    const counts = new Map<string, number>();
    for (const img of images) {
      const v = get(img)?.trim();
      if (!v) continue;
      const key = v.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key);
  }
  
  // Finds images matching the single most popular color + medium + subject.
  // If fewer than `count` images qualify, widens to the top 2 most popular
  // value in each category, then top 3, and so on, until enough images
  // qualify (or every distinct value has been included, whichever comes
  // first). Images missing any of the three fields are never eligible.
  export function getMostPopularCombo(images: ImageInput[], count = 9): PopularMatch[] {
    const colorRanked = rankedValues(images, (i) => i.color);
    const mediumRanked = rankedValues(images, (i) => i.medium);
    const subjectRanked = rankedValues(images, (i) => i.subject_matter);
  
    const colorIndex = new Map(colorRanked.map((v, i) => [v, i]));
    const mediumIndex = new Map(mediumRanked.map((v, i) => [v, i]));
    const subjectIndex = new Map(subjectRanked.map((v, i) => [v, i]));
  
    const eligible: PopularMatch[] = [];
    for (const img of images) {
      const c = img.color?.trim().toLowerCase();
      const m = img.medium?.trim().toLowerCase();
      const s = img.subject_matter?.trim().toLowerCase();
      if (!c || !m || !s) continue;
      const colorRank = colorIndex.get(c);
      const mediumRank = mediumIndex.get(m);
      const subjectRank = subjectIndex.get(s);
      if (colorRank === undefined || mediumRank === undefined || subjectRank === undefined) continue;
      eligible.push({ image: img, colorRank, mediumRank, subjectRank });
    }
  
    const maxLevel = Math.max(colorRanked.length, mediumRanked.length, subjectRanked.length, 1) - 1;
  
    for (let level = 0; level <= maxLevel; level++) {
      const candidates = eligible.filter(
        (e) => e.colorRank <= level && e.mediumRank <= level && e.subjectRank <= level
      );
      if (candidates.length >= count || level === maxLevel) {
        return candidates
          .sort((a, b) => (a.colorRank + a.mediumRank + a.subjectRank) - (b.colorRank + b.mediumRank + b.subjectRank))
          .slice(0, count);
      }
    }
    return [];
  }