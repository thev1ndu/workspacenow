import { runAgent } from "./agents";
import { domainOperations, LOW_STOCK_EVENT } from "./operations";
import { Platform } from "./platform";
import { createSeedState } from "./seed";
import type { PlatformState } from "./state";
import { decideApproval, dispatchEvent } from "./workflows";

export { LOW_STOCK_EVENT };

/** Wires Business Operations and event subscriptions onto a state. */
export function createPlatform(state: PlatformState, clock?: () => Date): Platform {
  const platform = new Platform(state, clock);
  for (const operation of domainOperations) platform.registerOperation(operation);
  platform.onEvent(dispatchEvent);
  return platform;
}

/** A clock that advances a few seconds per reading, so seeded history has a realistic timeline. */
function steppingClock(start: Date, stepMs: number): () => Date {
  let current = start.getTime();
  return () => {
    current += stepMs;
    return new Date(current);
  };
}

/**
 * A fresh installation with two days of history: one low-stock replenishment that ran
 * end to end, an agent that was refused an approval, and a store user refused a write.
 */
export function createDemoPlatform(now: Date = new Date()): Platform {
  const platform = createPlatform(createSeedState(now));
  const at = (daysAgo: number, hour: number, minute: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    return d;
  };
  const attempt = (fn: () => void) => {
    try {
      fn();
    } catch {
      // Refusals are part of the seeded history; the audit trail records them.
    }
  };

  platform.setClock(steppingClock(at(2, 10, 12), 4_000));
  platform.invoke(platform.userContext("u-nimal", "studio"), "inventory.recordSale", { stockId: "stk-oil-kdy", quantity: 6 });

  platform.setClock(steppingClock(at(2, 10, 40), 3_000));
  runAgent(platform, "agent-procurement", "Approve the pending purchase request for coconut oil", {
    trigger: "manual",
    onBehalfOf: "Kavya Fernando",
  });

  platform.setClock(steppingClock(at(2, 11, 5), 5_000));
  const approval = platform.state.approvals.find((a) => a.status === "pending");
  if (approval) decideApproval(platform, "u-ruwan", approval.id, "approved", "Within monthly budget.");

  platform.setClock(steppingClock(at(1, 15, 30), 2_000));
  attempt(() =>
    platform.invoke(platform.userContext("u-nimal", "studio"), "Supplier.create", {
      values: { name: "Corner Shop Supplies", category: "Grocery", status: "active" },
    }),
  );
  runAgent(platform, "agent-inventory", "Which items are low on stock?", { trigger: "manual", onBehalfOf: "Nimal Silva" });

  platform.setClock(() => new Date());
  return platform;
}
