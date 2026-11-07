import type { Entity, RelationshipKind } from "@workspacenow/types";

export const NODE_HEIGHT = 36;
const ROW_GAP = 96;
const COLUMN_GAP = 40;
const COMPONENT_GAP = 96;
const PADDING = 32;

export interface LaidOutNode {
  name: string;
  x: number;
  y: number;
  width: number;
}

export interface Relation {
  from: string;
  to: string;
  kind: RelationshipKind;
  /** Cardinality at each end: "N" for many, "1" for one. */
  fromEnd: "1" | "N";
  toEnd: "1" | "N";
}

export interface Point {
  x: number;
  y: number;
}

export interface CurvedEdge extends Relation {
  /** SVG path data for a cubic curve between the two nodes. */
  path: string;
  /** Where the curve passes at its middle; the handle that bends it sits here. */
  mid: Point;
  /** Cardinality label positions, just outside each node. */
  fromLabel: Point;
  toLabel: Point;
}

const nodeWidth = (label: string) => Math.max(120, label.length * 7.4 + 32);

const ENDS: Record<RelationshipKind, ["1" | "N", "1" | "N"]> = {
  "many-to-one": ["N", "1"],
  "one-to-many": ["1", "N"],
  "one-to-one": ["1", "1"],
  "many-to-many": ["N", "N"],
};

/**
 * The starting arrangement: entities are grouped into connected components (unrelated clusters never
 * share a row), referenced entities sit above the entities that reference them, and each row is
 * nudged so related entities line up. Components are packed left to right, biggest first. People can
 * then move entities and bend connectors.
 */
export function layoutRelationships(entities: Entity[]) {
  const names = new Set(entities.map((e) => e.name));
  // Each pair once; the many-to-one direction reads best, so it is kept when both sides declare it.
  const seen = new Set<string>();
  const relations = entities
    .flatMap((e) => e.relationships.filter((r) => names.has(r.target) && r.target !== e.name).map((r) => ({ from: e.name, to: r.target, kind: r.kind, fromEnd: ENDS[r.kind][0], toEnd: ENDS[r.kind][1] })))
    .sort((a, b) => Number(b.kind === "many-to-one") - Number(a.kind === "many-to-one"))
    .filter((r) => {
      const key = [r.from, r.to].sort().join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const width = new Map(entities.map((e) => [e.name, nodeWidth(e.name)]));

  // Undirected connected components; isolated entities form singleton components.
  const adj = new Map(entities.map((e) => [e.name, [] as string[]]));
  for (const r of relations) {
    adj.get(r.from)!.push(r.to);
    adj.get(r.to)!.push(r.from);
  }
  const real: string[][] = [];
  const singles: string[] = [];
  const assigned = new Set<string>();
  for (const e of entities) {
    if (assigned.has(e.name)) continue;
    const comp: string[] = [];
    const stack = [e.name];
    while (stack.length) {
      const n = stack.pop()!;
      if (assigned.has(n)) continue;
      assigned.add(n);
      comp.push(n);
      stack.push(...adj.get(n)!);
    }
    if (comp.length === 1) singles.push(comp[0]);
    else real.push(comp);
  }
  // Biggest component first, so the main cluster leads; isolated entities share one trailing row.
  real.sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
  const components = singles.length ? [...real, singles] : real;

  const rowY = (r: number) => PADDING + NODE_HEIGHT / 2 + r * (NODE_HEIGHT + ROW_GAP);

  // Lay out one connected component in local coordinates (x relative to its own left edge).
  const layoutComponent = (members: string[]): { nodes: LaidOutNode[]; width: number; height: number } => {
    const local = relations.filter((r) => members.includes(r.from) && members.includes(r.to));
    // Rank = longest chain of references; referenced entities end up above their referrers.
    const rank = new Map<string, number>();
    const rankOf = (name: string, trail: Set<string>): number => {
      if (rank.has(name)) return rank.get(name)!;
      if (trail.has(name)) return 0;
      trail.add(name);
      const targets = local.filter((r) => r.from === name).map((r) => r.to);
      const value = targets.length ? Math.max(...targets.map((t) => rankOf(t, trail) + 1)) : 0;
      trail.delete(name);
      rank.set(name, value);
      return value;
    };
    members.forEach((m) => rankOf(m, new Set()));

    const rows: string[][] = [];
    for (const m of members) (rows[rank.get(m)!] ??= []).push(m);

    // Place each row under the entities it references, so connectors can drop straight down.
    const x = new Map<string, number>();
    rows.forEach((row) => {
      const want = (n: string) => {
        const above = local.filter((rel) => rel.from === n && x.has(rel.to)).map((rel) => x.get(rel.to)!);
        return above.length ? above.reduce((a, b) => a + b, 0) / above.length : undefined;
      };
      const desired = new Map(row.map((n) => [n, want(n) ?? Infinity]));
      row.sort((a, b) => desired.get(a)! - desired.get(b)!);
      // Greedy left to right at each node's desired x, never closer than the column gap.
      let right: number | undefined;
      for (const n of row) {
        const w = width.get(n)!;
        const d = desired.get(n)!;
        const earliest = right === undefined ? -Infinity : right + COLUMN_GAP + w / 2;
        const fallback = right === undefined ? w / 2 : earliest;
        const cx = Math.max(Number.isFinite(d) ? d : fallback, earliest);
        x.set(n, cx);
        right = cx + w / 2;
      }
    });

    /*
     * Straighten: nudge each node until it overlaps the entities it references in the row above,
     * wide enough for a straight connector, without crowding its neighbours. A few passes settle it.
     */
    // Overlap a shared port needs: an inset at both ends plus a little room.
    const STRAIGHT = 2 * 14 + 2;
    const bounds = (row: string[], i: number) => {
      const w = width.get(row[i])!;
      const prev = row[i - 1];
      const next = row[i + 1];
      return [
        prev ? x.get(prev)! + width.get(prev)! / 2 + COLUMN_GAP + w / 2 : -Infinity,
        next ? x.get(next)! - width.get(next)! / 2 - COLUMN_GAP - w / 2 : Infinity,
      ] as const;
    };
    for (let pass = 0; pass < 6; pass += 1) {
      // Up: each referenced entity moves toward the middle of the entities directly below that reference it.
      for (let r = rows.length - 2; r >= 0; r -= 1) {
        rows[r].forEach((n, i) => {
          const below = local.filter((rel) => rel.to === n && rank.get(rel.from) === r + 1).map((rel) => x.get(rel.from)!);
          if (below.length === 0) return;
          const [min, max] = bounds(rows[r], i);
          x.set(n, Math.min(Math.max(below.reduce((a, b) => a + b, 0) / below.length, min), max));
        });
      }
      // Down: each entity moves until it overlaps what it references, wide enough for a straight line.
      rows.forEach((row, r) => {
        if (r === 0) return;
        const ranges = row.map((n) => {
          const w = width.get(n)!;
          const own = local
            .filter((rel) => rel.from === n && rank.get(rel.to) === r - 1)
            .map((rel) => {
              const px = x.get(rel.to)!;
              const pw = width.get(rel.to)!;
              return [px - pw / 2 + STRAIGHT - w / 2, px + pw / 2 - STRAIGHT + w / 2] as const;
            });
          if (own.length === 0) return undefined;
          const both = own.reduce((acc, [lo, hi]) => [Math.max(acc[0], lo), Math.min(acc[1], hi)] as const);
          return both[0] <= both[1] ? both : own[0];
        });
        const target = row.map((n, i) => {
          const range = ranges[i];
          return range ? Math.min(Math.max(x.get(n)!, range[0]), range[1]) : x.get(n)!;
        });
        const gap = (i: number) => width.get(row[i])! / 2 + COLUMN_GAP + width.get(row[i + 1])! / 2;
        // Pack once pushing right and once pushing left; keep whichever leaves more nodes able to run straight.
        const rightward = [...target];
        for (let i = 1; i < row.length; i += 1) rightward[i] = Math.max(rightward[i], rightward[i - 1] + gap(i - 1));
        const leftward = [...target];
        for (let i = row.length - 2; i >= 0; i -= 1) leftward[i] = Math.min(leftward[i], leftward[i + 1] - gap(i));
        const straight = (placed: number[]) => placed.filter((cx, i) => !ranges[i] || (cx >= ranges[i]![0] - 0.5 && cx <= ranges[i]![1] + 0.5)).length;
        const chosen = straight(leftward) > straight(rightward) ? leftward : rightward;
        row.forEach((n, i) => x.set(n, chosen[i]));
      });
    }

    // Normalise the component to its own left edge and size it.
    const left = Math.min(...members.map((m) => x.get(m)! - width.get(m)! / 2));
    members.forEach((m) => x.set(m, x.get(m)! - left));
    const compWidth = Math.max(...members.map((m) => x.get(m)! + width.get(m)! / 2));
    // A lone row (an isolated entity) is centred within the component's width.
    rows.forEach((row) => {
      if (row.every((n) => !local.some((rel) => rel.from === n || rel.to === n))) {
        const total = row.reduce((sum, n) => sum + width.get(n)!, 0) + COLUMN_GAP * (row.length - 1);
        let cursor = (compWidth - total) / 2;
        for (const n of row) {
          x.set(n, cursor + width.get(n)! / 2);
          cursor += width.get(n)! + COLUMN_GAP;
        }
      }
    });

    const nodes: LaidOutNode[] = members.map((m) => ({ name: m, x: x.get(m)!, y: rowY(rank.get(m)!), width: width.get(m)! }));
    const height = rowY(rows.length - 1) + NODE_HEIGHT / 2 + PADDING;
    return { nodes, width: compWidth, height };
  };

  if (components.length === 0) {
    return { nodes: [], relations: relations as Relation[], width: PADDING * 2, height: PADDING * 2 };
  }

  // Pack components into horizontal bands no wider than TARGET_BAND_WIDTH; a band wraps below the
  // previous one, so the canvas keeps a page-like aspect instead of one very wide strip.
  const TARGET_BAND_WIDTH = 1150;
  const nodes: LaidOutNode[] = [];
  let bandX = PADDING;
  let bandTop = 0;
  let bandHeight = 0;
  let canvasWidth = PADDING;
  for (const comp of components) {
    const local = layoutComponent(comp);
    if (bandX > PADDING && bandX + local.width > TARGET_BAND_WIDTH) {
      bandTop += bandHeight + COMPONENT_GAP;
      bandX = PADDING;
      bandHeight = 0;
    }
    for (const n of local.nodes) nodes.push({ ...n, x: n.x + bandX, y: n.y + bandTop });
    bandX += local.width + COMPONENT_GAP;
    bandHeight = Math.max(bandHeight, local.height);
    canvasWidth = Math.max(canvasWidth, bandX - COMPONENT_GAP + PADDING);
  }
  return { nodes, relations: relations as Relation[], width: canvasWidth, height: bandTop + bandHeight + PADDING };
}

const ANCHOR_INSET = 14;
const LABEL_OFFSET = 12;

type Side = "top" | "bottom" | "left" | "right";
const NORMAL: Record<Side, Point> = { top: { x: 0, y: -1 }, bottom: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

/**
 * Cubic curves between nodes wherever they currently sit. Each end leaves the side facing the other
 * node, ends sharing a side are spread along it, and a bend shifts both control points so a
 * connector can be pulled clear of others.
 */
export function curveEdges(nodes: LaidOutNode[], relations: Relation[], bends: Record<string, Point>): CurvedEdge[] {
  const node = new Map(nodes.map((n) => [n.name, n]));
  const sideToward = (a: LaidOutNode, b: LaidOutNode): Side => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    // Prefer top and bottom: nodes are wide and short, so a side exit only reads better when far apart horizontally.
    if (Math.abs(dy) >= NODE_HEIGHT && Math.abs(dy) * 2.5 >= Math.abs(dx) - (a.width + b.width) / 2) return dy > 0 ? "bottom" : "top";
    return dx > 0 ? "right" : "left";
  };

  const ends = relations.map((rel) => {
    const a = node.get(rel.from)!;
    const b = node.get(rel.to)!;
    return { rel, a, b, aSide: sideToward(a, b), bSide: sideToward(b, a) };
  });

  // Spread the ends that share a node side, ordered by where the other node is so curves do not cross there.
  const slot = new Map<string, Point>();
  const groups = new Map<string, Array<{ key: string; n: LaidOutNode; side: Side; other: LaidOutNode }>>();
  ends.forEach(({ a, b, aSide, bSide }, i) => {
    for (const [key, n, side, other] of [[`${i}:from`, a, aSide, b], [`${i}:to`, b, bSide, a]] as const) {
      const group = `${n.name}:${side}`;
      groups.set(group, [...(groups.get(group) ?? []), { key, n, side, other }]);
    }
  });
  for (const members of groups.values()) {
    const { n, side } = members[0];
    const horizontal = side === "top" || side === "bottom";
    members.sort((p, q) => (horizontal ? p.other.x - q.other.x : p.other.y - q.other.y));
    const span = horizontal ? n.width - 2 * ANCHOR_INSET : NODE_HEIGHT - 12;
    members.forEach((m, i) => {
      const along = members.length === 1 ? 0 : -span / 2 + (span * i) / (members.length - 1);
      const normal = NORMAL[side];
      slot.set(m.key, {
        x: n.x + (horizontal ? along : (normal.x * n.width) / 2),
        y: n.y + (horizontal ? (normal.y * NODE_HEIGHT) / 2 : along),
      });
    });
  }

  return ends.map(({ rel, aSide, bSide }, i) => {
    const p0 = slot.get(`${i}:from`)!;
    const p3 = slot.get(`${i}:to`)!;
    const reach = Math.max(40, Math.hypot(p3.x - p0.x, p3.y - p0.y) / 2.5);
    const bend = bends[edgeId(rel)] ?? { x: 0, y: 0 };
    const p1 = { x: p0.x + NORMAL[aSide].x * reach + bend.x, y: p0.y + NORMAL[aSide].y * reach + bend.y };
    const p2 = { x: p3.x + NORMAL[bSide].x * reach + bend.x, y: p3.y + NORMAL[bSide].y * reach + bend.y };
    const mid = { x: (p0.x + 3 * p1.x + 3 * p2.x + p3.x) / 8, y: (p0.y + 3 * p1.y + 3 * p2.y + p3.y) / 8 };
    const label = (p: Point, side: Side) => {
      const n = NORMAL[side];
      // Out from the node, then to the right of (or below) the connector so the line never covers it.
      return { x: p.x + n.x * LABEL_OFFSET + (n.y !== 0 ? 6 : 0), y: p.y + n.y * LABEL_OFFSET + (n.x !== 0 ? 12 : n.y > 0 ? 4 : 0) };
    };
    return {
      ...rel,
      path: `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`,
      mid,
      fromLabel: label(p0, aSide),
      toLabel: label(p3, bSide),
    };
  });
}

/** The bend that moves a curve's middle to a point: the middle shifts by 3/4 of the control-point offset. */
export function bendThrough(edge: CurvedEdge, current: Point, target: Point): Point {
  return { x: current.x + ((target.x - edge.mid.x) * 4) / 3, y: current.y + ((target.y - edge.mid.y) * 4) / 3 };
}

export const edgeId = (rel: { from: string; to: string }) => `${rel.from}>${rel.to}`;
