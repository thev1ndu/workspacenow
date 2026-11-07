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

  it("keeps each connected component in its own horizontal band (components never share rows)", () => {
    // The demo's main cluster, the Event/Ticket pair, the Customer/SupportTicket pair and the two
    // isolated entities are separate components; their x-ranges must not interleave with another
    // component's rows in a way that mixes them — simplest strong check: component x-ranges are disjoint.
    const componentOf = (name: string) => {
      if (["Supplier", "Product", "PurchaseOrder", "PurchaseRequest", "Stock"].includes(name)) return "main";
      if (name === "Event" || name === "Ticket") return "events";
      if (name === "Customer" || name === "SupportTicket") return "support";
      return name; // singletons
    };
    const range = (comp: string) => {
      const xs = nodes.filter((n) => componentOf(n.name) === comp).map((n) => [n.x - n.width / 2, n.x + n.width / 2] as const);
      return [Math.min(...xs.map((r) => r[0])), Math.max(...xs.map((r) => r[1]))] as const;
    };
    const comps = [...new Set(nodes.map((n) => componentOf(n.name)))];
    for (let i = 0; i < comps.length; i += 1) {
      for (let j = i + 1; j < comps.length; j += 1) {
        const [aLo, aHi] = range(comps[i]);
        const [bLo, bHi] = range(comps[j]);
        expect(aHi < bLo || bHi < aLo, `${comps[i]} interleaves ${comps[j]}`).toBe(true);
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
});
