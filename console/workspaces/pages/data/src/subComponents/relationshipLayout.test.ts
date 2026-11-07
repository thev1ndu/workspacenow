import { describe, expect, it } from "vitest";
import type { Entity, EntityRelationship } from "@workspacenow/types";
import { NODE_HEIGHT, layoutRelationships } from "./relationshipLayout";

function entity(name: string, relationships: EntityRelationship[] = []): Entity {
  return {
    id: name,
    name,
    label: name,
    description: "",
    scope: "application",
    fields: [],
    relationships,
    events: [],
    readPermission: "read",
    writePermission: "write",
    version: 1,
    lifecycle: "active",
  } as unknown as Entity;
}

const rel = (target: string, kind: EntityRelationship["kind"] = "many-to-one"): EntityRelationship => ({
  name: `${target}Ref`,
  kind,
  target,
});

// Mirrors the seeded demo model: one main cluster plus isolated and separate entities.
const demo = [
  entity("Supplier", [rel("Product", "one-to-many"), rel("PurchaseOrder", "one-to-many")]),
  entity("Product", [rel("Supplier"), rel("Stock", "one-to-many")]),
  entity("PurchaseOrder", [rel("Supplier"), rel("PurchaseRequest", "one-to-one")]),
  entity("PurchaseRequest", [rel("Product"), rel("Supplier"), rel("PurchaseOrder", "one-to-many")]),
  entity("Stock", [rel("Product")]),
  entity("Event", [rel("Ticket", "one-to-many")]),
  entity("Ticket"),
  entity("Customer", [rel("SupportTicket", "one-to-many")]),
  entity("SupportTicket"),
  entity("Sale"),
  entity("PosSale"),
];

describe("layoutRelationships", () => {
  const { nodes, relations, width, height } = layoutRelationships(demo);
  const byName = new Map(nodes.map((n) => [n.name, n]));

  it("places every entity exactly once, inside the canvas", () => {
    expect(nodes).toHaveLength(demo.length);
    for (const n of nodes) {
      expect(n.x - n.width / 2).toBeGreaterThanOrEqual(0);
      expect(n.x + n.width / 2).toBeLessThanOrEqual(width);
      expect(n.y - NODE_HEIGHT / 2).toBeGreaterThanOrEqual(0);
      expect(n.y + NODE_HEIGHT / 2).toBeLessThanOrEqual(height);
    }
  });

  it("never overlaps two nodes", () => {
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const overlapX = Math.abs(a.x - b.x) < (a.width + b.width) / 2;
        const overlapY = Math.abs(a.y - b.y) < NODE_HEIGHT;
        expect(overlapX && overlapY, `${a.name} overlaps ${b.name}`).toBe(false);
      }
    }
  });

  it("never lets different connected components overlap in 2D", () => {
    // Bands wrap vertically, so components may share an x-range — but their nodes must never overlap.
    const componentOf = (name: string) => {
      if (["Supplier", "Product", "PurchaseOrder", "PurchaseRequest", "Stock"].includes(name)) return "main";
      if (name === "Event" || name === "Ticket") return "events";
      if (name === "Customer" || name === "SupportTicket") return "support";
      return `single:${name}`;
    };
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        if (componentOf(nodes[i].name) === componentOf(nodes[j].name)) continue;
        const a = nodes[i];
        const b = nodes[j];
        const overlap = Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.y - b.y) < NODE_HEIGHT;
        expect(overlap, `${a.name} overlaps ${b.name} across components`).toBe(false);
      }
    }
  });

  it("puts referenced entities above the entities that reference them", () => {
    expect(byName.get("Supplier")!.y).toBeLessThan(byName.get("Product")!.y);
    expect(byName.get("Product")!.y).toBeLessThan(byName.get("Stock")!.y);
  });

  it("deduplicates a pair declared on both sides", () => {
    expect(relations.filter((r) => [r.from, r.to].sort().join("|") === "Product|Supplier")).toHaveLength(1);
  });

  it("keeps the canvas page-shaped (bands wrap instead of one wide strip)", () => {
    expect(width).toBeLessThanOrEqual(1150 + 64); // target band width + padding
    expect(width / height).toBeGreaterThan(0.5); // wider than tall, but not a ribbon
  });

  it("handles an empty model", () => {
    const empty = layoutRelationships([]);
    expect(empty.nodes).toHaveLength(0);
    expect(empty.width).toBeGreaterThan(0);
    expect(empty.height).toBeGreaterThan(0);
  });
});
