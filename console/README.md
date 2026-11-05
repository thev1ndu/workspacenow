# WorkspaceNow console

The WorkspaceNow Shell and its six Workspaces (Studio, Connect, Data, AI, Flow, Control), with a fully working
demonstration of the Retail Operations scenario from `../PROPOSAL.md`. Vocabulary follows `../CONTEXT.md`.

The demo needs no backend. `@workspacenow/mock-server` is an in-browser platform runtime that serves the
installation's REST API: Entity Runtime, Business Operations, MCP tools, agent runs, durable-style workflows,
approvals, events and audit. State persists in `localStorage`; reset it from the account menu.

The UI is HeroUI v3 on Tailwind CSS v4, with EvilCharts (Recharts) for charts and Gravity UI icons. See
`docs/UI-GUIDE.md` before changing any screen.

## Run

```bash
pnpm install
pnpm dev          # http://localhost:3100
pnpm test         # platform runtime tests
pnpm typecheck
pnpm build
```

## Demo script

1. Sign in as **Nimal Silva** (Store Manager). On Home, press **Record a sale**: stock crosses its reorder level and
   `Stock.LowStockReached` is published.
2. The **Low-stock replenishment** workflow starts. The **Procurement Assistant** agent, acting as its own service
   identity, calls MCP tools to read stock, suppliers and policy and submits a purchase request. The workflow then waits
   for approval.
3. Try approving as Nimal or Kavya: the platform denies it and audits the attempt.
4. Switch to **Ruwan Jayasinghe** (Procurement Manager) from the account menu and approve in **Flow → Approvals**.
   The workflow issues the purchase order and notifies the store and the supplier.
5. Switch to **Dilini Wickramasinghe** (Auditor) and open **Control → Traces** to see the whole chain, from the sale
   through the agent's tool calls to the order, in one trace.

Other things to try: the **AI → Agents → Procurement Assistant → Playground** ("Approve the pending purchase
request" is refused at the tool level); **Studio → New application** with the employee-management prompt;
**Connect → APIs** to expose an operation as an MCP tool or try an operation; **Control → Access** to change which
groups map to which roles.

## Layout

| Package | Role |
|---|---|
| `apps/web-ui` | Vite entry and runtime `config.js` |
| `workspaces/core-ui` | Providers, router, Shell layout, sign-in |
| `workspaces/libs/types` | Domain types, route map, runtime config |
| `workspaces/libs/mock-server` | In-browser platform runtime and its REST router |
| `workspaces/libs/api-client` | Fetch functions and TanStack Query hooks (two-file pattern) |
| `workspaces/libs/auth` | Demo OIDC persona sign-in |
| `workspaces/libs/views` | HeroUI-based primitives (page frame, cards, chips, fields, toasts) |
| `workspaces/libs/charting` | `@workspacenow/charts`: vendored EvilCharts components (MIT) |
| `workspaces/pages/<workspace>` | One package per Workspace, plus `overview` for Home |

To run against a real backend, replace the transport in `libs/api-client/src/utils/http.ts` with `fetch`; nothing
above it changes.
