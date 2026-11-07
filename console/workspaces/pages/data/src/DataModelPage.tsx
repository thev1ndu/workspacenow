import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Button, Chip, Skeleton } from "@heroui/react";
import { ArrowRight, ArrowRotateLeft } from "@workspacenow/icons";
import { useNavigate } from "react-router-dom";
import { useListEntities } from "@workspacenow/api-client";
import { buildPath, routes, type Entity } from "@workspacenow/types";
import { PageLayout, QueryState, SectionCard, TextLink, SectionCardSkeleton, DetailSkeleton } from "@workspacenow/views";
import { ScopeChip } from "./subComponents/ScopeChip";
import { NODE_HEIGHT, bendThrough, curveEdges, edgeId, layoutRelationships, type Point } from "./subComponents/relationshipLayout";

const LAYOUT_KEY = "workspacenow-data-model-layout";
const KEY_STEP = 10;
const DRAG_THRESHOLD = 3;
const VIEW_PADDING = 24;

interface SavedLayout {
  nodes: Record<string, Point>;
  bends: Record<string, Point>;
}

function readLayout(): SavedLayout {
  try {
    const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? "null") as SavedLayout | null;
    return { nodes: saved?.nodes ?? {}, bends: saved?.bends ?? {} };
  } catch {
    return { nodes: {}, bends: {} };
  }
}

function writeLayout(layout: SavedLayout): void {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    // The arrangement still applies for this visit.
  }
}

type Drag =
  | { kind: "node"; name: string; grab: Point; start: Point; moved: boolean; view: string }
  | { kind: "bend"; id: string; view: string };

/**
 * Entities joined by curved connectors marked 1 or N at each end. Drag an entity to place it, drag a
 * connector's handle to bend it; the arrangement is remembered and can be reset.
 */
function RelationshipGraph({ entities }: { entities: Entity[] }) {
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [layout, setLayout] = useState(readLayout);
  const [drag, setDrag] = useState<Drag | null>(null);
  const auto = useMemo(() => layoutRelationships(entities), [entities]);

  const nodes = auto.nodes.map((n) => ({ ...n, ...layout.nodes[n.name] }));
  const edges = curveEdges(nodes, auto.relations, layout.bends);
  const scope = new Map(entities.map((e) => [e.name, e.scope]));
  const customised = Object.keys(layout.nodes).length > 0 || Object.keys(layout.bends).length > 0;

  // The canvas grows to hold wherever entities and bends are placed; it is frozen during a drag so the scale holds still.
  const xs = [0, auto.width, ...nodes.flatMap((n) => [n.x - n.width / 2, n.x + n.width / 2]), ...edges.map((e) => e.mid.x)];
  const ys = [0, auto.height, ...nodes.flatMap((n) => [n.y - NODE_HEIGHT / 2, n.y + NODE_HEIGHT / 2]), ...edges.map((e) => e.mid.y)];
  const minX = Math.min(...xs) - VIEW_PADDING;
  const minY = Math.min(...ys) - VIEW_PADDING;
  const liveView = `${minX} ${minY} ${Math.max(...xs) + VIEW_PADDING - minX} ${Math.max(...ys) + VIEW_PADDING - minY}`;
  const viewBox = drag?.view ?? liveView;

  const update = (next: SavedLayout) => {
    setLayout(next);
    writeLayout(next);
  };
  const toSvg = (ev: { clientX: number; clientY: number }): Point => {
    const matrix = svgRef.current?.getScreenCTM()?.inverse();
    if (!matrix) return { x: ev.clientX, y: ev.clientY };
    const pt = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(matrix);
    return { x: pt.x, y: pt.y };
  };
  const open = (name: string) => navigate(buildPath(routes.data.entity, { entityName: name }));
  const moveNode = (name: string, to: Point) => update({ ...layout, nodes: { ...layout.nodes, [name]: to } });
  const touches = (edge: { from: string; to: string }) => !focused || edge.from === focused || edge.to === focused;

  const onPointerMove = (ev: ReactPointerEvent) => {
    if (!drag) return;
    const at = toSvg(ev);
    if (drag.kind === "node") {
      const moved = drag.moved || Math.hypot(at.x - drag.start.x, at.y - drag.start.y) > DRAG_THRESHOLD;
      if (moved !== drag.moved) setDrag({ ...drag, moved });
      if (moved) setLayout((l) => ({ ...l, nodes: { ...l.nodes, [drag.name]: { x: at.x - drag.grab.x, y: at.y - drag.grab.y } } }));
    } else {
      const edge = edges.find((e) => edgeId(e) === drag.id);
      if (edge) setLayout((l) => ({ ...l, bends: { ...l.bends, [drag.id]: bendThrough(edge, l.bends[drag.id] ?? { x: 0, y: 0 }, at) } }));
    }
  };
  const onPointerUp = () => {
    if (!drag) return;
    if (drag.kind === "node" && !drag.moved) open(drag.name);
    else writeLayout(layout);
    setDrag(null);
  };

  return (
    <div className="text-foreground">
      <svg
        ref={svgRef}
        viewBox={viewBox}
        width="100%"
        style={{ display: "block", maxHeight: "calc(100dvh - 16rem)" }}
        className={`w-full touch-none select-none ${drag ? "cursor-grabbing" : ""}`}
        role="group"
        aria-label="Entity relationship graph"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
      >
        {edges.map((edge) => {
          const id = edgeId(edge);
          const active = touches(edge);
          const bending = drag?.kind === "bend" && drag.id === id;
          return (
            <g key={id} className={(active && focused) || bending ? "text-accent" : "text-muted"} opacity={active ? 1 : 0.25}>
              <title>{`${edge.from} ${edge.kind} ${edge.to}`}</title>
              <path d={edge.path} fill="none" stroke="currentColor" strokeOpacity={(focused && active) || bending ? 1 : 0.6} strokeWidth={1.5} />
              <text x={edge.fromLabel.x} y={edge.fromLabel.y} fontSize={10} fontWeight={600} fill="currentColor">
                {edge.fromEnd}
              </text>
              <text x={edge.toLabel.x} y={edge.toLabel.y} fontSize={10} fontWeight={600} fill="currentColor">
                {edge.toEnd}
              </text>
              {/* Drag to bend the connector; double-click to straighten it again. */}
              <circle
                cx={edge.mid.x}
                cy={edge.mid.y}
                r={5}
                fill="var(--background)"
                stroke="currentColor"
                strokeWidth={1.5}
                className="cursor-move opacity-40 transition-opacity hover:opacity-100"
                onPointerDown={(ev) => {
                  ev.stopPropagation();
                  ev.currentTarget.ownerSVGElement?.setPointerCapture(ev.pointerId);
                  setDrag({ kind: "bend", id, view: liveView });
                }}
                onDoubleClick={() => {
                  const bends = { ...layout.bends };
                  delete bends[id];
                  update({ ...layout, bends });
                }}
              >
                <title>Drag to bend, double-click to reset</title>
              </circle>
            </g>
          );
        })}
        {nodes.map((n) => (
          <g
            key={n.name}
            className={`text-accent outline-none focus-visible:opacity-70 ${drag ? "" : "cursor-grab"}`}
            role="button"
            tabIndex={0}
            aria-label={`${n.name}. Press Enter to open, arrow keys to move.`}
            onPointerDown={(ev) => {
              if (ev.button !== 0) return;
              ev.currentTarget.ownerSVGElement?.setPointerCapture(ev.pointerId);
              const at = toSvg(ev);
              setDrag({ kind: "node", name: n.name, grab: { x: at.x - n.x, y: at.y - n.y }, start: at, moved: false, view: liveView });
            }}
            onKeyDown={(ev) => {
              if (ev.key === "Enter") return open(n.name);
              const step = ev.shiftKey ? KEY_STEP * 4 : KEY_STEP;
              const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[ev.key];
              if (!delta) return;
              ev.preventDefault();
              moveNode(n.name, { x: n.x + delta[0], y: n.y + delta[1] });
            }}
            onMouseEnter={() => !drag && setFocused(n.name)}
            onMouseLeave={() => !drag && setFocused(null)}
            onFocus={() => setFocused(n.name)}
            onBlur={() => setFocused(null)}
          >
            <rect
              x={n.x - n.width / 2}
              y={n.y - NODE_HEIGHT / 2}
              width={n.width}
              height={NODE_HEIGHT}
              rx={8}
              fill="var(--background)"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeDasharray={scope.get(n.name) === "external" ? "4 3" : undefined}
            />
            <rect
              x={n.x - n.width / 2}
              y={n.y - NODE_HEIGHT / 2}
              width={n.width}
              height={NODE_HEIGHT}
              rx={8}
              fill="currentColor"
              fillOpacity={focused === n.name ? 0.2 : 0.12}
            />
            <text x={n.x} y={n.y + 4} fontSize={12} fontWeight={600} textAnchor="middle" fill="currentColor">
              {n.name}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">1 and N mark one or many at each end. Drag entities to arrange them and drag a connector's dot to bend it.</p>
        {customised && (
          <Button size="sm" variant="ghost" onPress={() => update({ nodes: {}, bends: {} })}>
            <ArrowRotateLeft className="size-3.5" aria-hidden />
            Reset layout
          </Button>
        )}
      </div>
    </div>
  );
}

export function DataModelPage() {
  const entities = useListEntities();
  return (
    <PageLayout title="Data model" description="How the organization's entities relate. Dashed boxes are owned by external systems.">
      <QueryState query={entities} skeleton={
        <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
          <SectionCardSkeleton>
            <Skeleton className="h-[28rem] rounded-xl" />
          </SectionCardSkeleton>
          <div className="grid content-start gap-4 lg:max-h-[calc(100dvh-12rem)] lg:overflow-y-auto lg:pr-1">
            <SectionCardSkeleton>
              <DetailSkeleton items={2} columns={1} />
            </SectionCardSkeleton>
            <SectionCardSkeleton>
              <DetailSkeleton items={2} columns={1} />
            </SectionCardSkeleton>
          </div>
        </div>
      }>
        {(data) => (
          // The graph card sizes to the graph; the entity list scrolls inside the viewport height,
          // so adding entities never grows the page.
          <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
            <SectionCard title="Relationship graph" subtitle="Click an entity to open it">
              <RelationshipGraph entities={data.items} />
            </SectionCard>
            <div className="grid content-start gap-4 lg:max-h-[calc(100dvh-12rem)] lg:overflow-y-auto lg:pr-1">
              {data.items.map((e) => (
                <SectionCard
                  key={e.name}
                  title={<TextLink to={buildPath(routes.data.entity, { entityName: e.name })}>{e.label}</TextLink>}
                  actions={<ScopeChip scope={e.scope} />}
                >
                  {e.relationships.length === 0 ? (
                    <p className="text-sm text-muted">No relationships.</p>
                  ) : (
                    <ul className="grid gap-2">
                      {e.relationships.map((r) => (
                        <li key={r.name} className="flex flex-wrap items-center gap-2 text-sm">
                          <span>{e.name}</span>
                          <Chip size="sm" variant="secondary">
                            {r.kind}
                          </Chip>
                          <ArrowRight className="size-3.5 text-muted" aria-hidden />
                          <TextLink to={buildPath(routes.data.entity, { entityName: r.target })}>{r.target}</TextLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionCard>
              ))}
            </div>
          </div>
        )}
      </QueryState>
    </PageLayout>
  );
}
