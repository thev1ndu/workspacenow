import { ArrowRight, Undo } from "@carbon/react/icons";
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Button, ContainedList, ContainedListItem, SkeletonPlaceholder, Tag } from "@carbon/react";

import { useNavigate } from "react-router-dom";
import { useListEntities } from "@workspacenow/api-client";
import { buildPath, routes, type Entity } from "@workspacenow/types";
import { LinkButton, NoDataFound, PageLayout, QueryState, SectionCard, TextLink, SectionCardSkeleton, DetailSkeleton } from "@workspacenow/views";
import { ScopeChip } from "./subComponents/ScopeChip";
import { NODE_HEIGHT, bendThrough, curveEdges, edgeId, layoutRelationships, type Point } from "./subComponents/relationshipLayout";

import common from "./common.module.scss";
import styles from "./DataModelPage.module.scss";

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
    <div>
      <svg
        ref={svgRef}
        viewBox={viewBox}
        width="100%"
        className={[styles.svg, drag ? styles.dragging : ""].filter(Boolean).join(" ")}
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
          const emphasised = (active && !!focused) || bending;
          return (
            <g key={id} className={[styles.edge, emphasised ? styles.edgeActive : "", active ? "" : styles.dimmed].filter(Boolean).join(" ")}>
              <title>{`${edge.from} ${edge.kind} ${edge.to}`}</title>
              <path d={edge.path} className={styles.path} />
              <text x={edge.fromLabel.x} y={edge.fromLabel.y} className={styles.end}>
                {edge.fromEnd}
              </text>
              <text x={edge.toLabel.x} y={edge.toLabel.y} className={styles.end}>
                {edge.toEnd}
              </text>
              {/* Drag to bend the connector; double-click to straighten it again. */}
              <circle
                cx={edge.mid.x}
                cy={edge.mid.y}
                r={5}
                className={styles.handle}
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
            className={[styles.node, focused === n.name ? styles.nodeFocused : ""].filter(Boolean).join(" ")}
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
              className={[styles.box, scope.get(n.name) === "external" ? styles.external : ""].filter(Boolean).join(" ")}
            />
            <rect x={n.x - n.width / 2} y={n.y - NODE_HEIGHT / 2} width={n.width} height={NODE_HEIGHT} className={styles.tint} />
            <text x={n.x} y={n.y + 4} textAnchor="middle" className={styles.name}>
              {n.name}
            </text>
          </g>
        ))}
      </svg>
      <div className={styles.footer}>
        <p className={styles.hint}>1 and N mark one or many at each end. Drag entities to arrange them and drag a connector's dot to bend it.</p>
        {customised && (
          <Button size="sm" kind="ghost" onClick={() => update({ nodes: {}, bends: {} })} renderIcon={Undo}>
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
      <QueryState
        query={entities}
        skeleton={
          <div className={styles.split}>
            <SectionCardSkeleton>
              <SkeletonPlaceholder className={styles.graphSkeleton} />
            </SectionCardSkeleton>
            <div className={styles.list}>
              <SectionCardSkeleton>
                <DetailSkeleton items={2} columns={1} />
              </SectionCardSkeleton>
              <SectionCardSkeleton>
                <DetailSkeleton items={2} columns={1} />
              </SectionCardSkeleton>
            </div>
          </div>
        }
      >
        {(data) =>
          data.items.length === 0 ? (
            <SectionCard>
              <NoDataFound
                message="No entities yet, so there are no relationships to draw."
                action={
                  <LinkButton size="sm" variant="secondary" href={routes.data.entities}>
                    Create an entity
                  </LinkButton>
                }
              />
            </SectionCard>
          ) : (
            <div className={styles.split}>
              <SectionCard title="Relationship graph" subtitle="Click an entity to open it">
                <RelationshipGraph entities={data.items} />
              </SectionCard>
              <div className={styles.list}>
                {data.items.map((e) => (
                  <SectionCard
                    key={e.name}
                    title={<TextLink to={buildPath(routes.data.entity, { entityName: e.name })}>{e.label}</TextLink>}
                    actions={<ScopeChip scope={e.scope} />}
                  >
                    {e.relationships.length === 0 ? (
                      <p className={common.helper}>No relationships.</p>
                    ) : (
                      <ContainedList label="Relationships" kind="on-page">
                        {e.relationships.map((r) => (
                          <ContainedListItem key={r.name}>
                            <div className={common.row}>
                              <span>{e.name}</span>
                              <Tag size="sm" type="gray">
                                {r.kind}
                              </Tag>
                              <ArrowRight size={16} className={common.arrow} aria-hidden />
                              <TextLink to={buildPath(routes.data.entity, { entityName: r.target })}>{r.target}</TextLink>
                            </div>
                          </ContainedListItem>
                        ))}
                      </ContainedList>
                    )}
                  </SectionCard>
                ))}
              </div>
            </div>
          )
        }
      </QueryState>
    </PageLayout>
  );
}
