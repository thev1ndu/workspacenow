# WorkspaceNow console — agent guide

React 19 + TypeScript, pnpm workspaces, Vite, TanStack Query, IBM Carbon Design System only: `@carbon/react` components, `@carbon/react/icons`, Carbon Charts (`@carbon/charts-react`, wrapped by `@workspacenow/charts`), Carbon themes (white, g10, g90, g100) and self-hosted IBM Plex. Packages are scoped `@workspacenow/*`
and ship TypeScript source (`main: ./src/index.ts`), so there is no per-package build step.

## File map

| Need | Location |
|---|---|
| Workspace pages | `workspaces/pages/<area>/src` (`ai`, `connect`, `control`, `data`, `flow`, `overview`, `studio`) |
| Shared libs | `workspaces/libs/{types,api-client,views,auth,charting,mock-server}` |
| Domain types + routes | `workspaces/libs/types/src` (`domain.ts`, `routes.ts` — use `routes` + `buildPath`, never hand-written paths) |
| API transport | `workspaces/libs/api-client/src/apis/<area>.ts` (pure fetch, takes `getToken`) + `hooks/<area>.ts` (`useApiQuery`/`useApiMutation`) |
| Shared UI | `workspaces/libs/views/src/component` (`PageLayout`, `SectionCard`, `QueryState`, `TablePager`, `Metric`/`MetricGrid`, `TextInput`/`SelectInput`, …) |
| Demo backend (whole contract and its authorization rules) | `workspaces/libs/mock-server/src` |
| App shell / workspace registration | `workspaces/core-ui/src/workspaces.tsx` |

## Golden path: add or change a page/endpoint

1. If the API contract changes: `../openapi.yaml` → `make -C ../wsn-service generate`, then mirror the route in `libs/mock-server/src/router.ts` (+ its test in `platform.test.ts`) and the fetch+hook in `libs/api-client`.
2. Add/adjust the page under `workspaces/pages/<area>/src`, using `PageLayout` + `QueryState` for loading/error/empty states.
3. Tables get search + pagination via `usePagedSearch(items, pageSize, text)` (or `usePagination` when filtering externally) and a `<TablePager/>` under the table — see `RunsPage`, `TracesPage`, `AuditPage`, `RecordsManager`, `AgentsPage`.
4. Dashboards use `MetricGrid`/`Metric` — a responsive grid of KPI cards (icon, value, hint, optional `href` makes the whole card a link).
5. Verify: `pnpm typecheck && pnpm lint && pnpm test` (and `pnpm build` for shell changes).

## Rules

- UI comes only from `@carbon/react` (plus the `@workspacenow/views` primitives), charts from `@workspacenow/charts` (Carbon Charts, long-format data, `isEmptySeries` empty state), icons from `@carbon/react/icons`. Lay out with Carbon `Grid`/`Column`, `Stack`, `Layer` and `Tile`; there are no utility classes. When Carbon has no prop for a detail, add a co-located `*.module.scss` that uses only Carbon tokens (`@carbon/styles/scss/{spacing,type,theme}`): no hard-coded colors, no rounded corners.
- Theme comes from `useCarbonTheme()` in `@workspacenow/views`; never add custom palettes.
- API calls follow the two-file pattern above. Never call the transport from a component.
- Mutations refresh every query on settle: platform writes fan out through events, workflows and audit.
- Forms are manual `useState`; server state is TanStack Query; there is no global store.
- Every business write goes through `Platform.invoke` in `libs/mock-server`, which authorizes, runs, audits and then publishes events. Do not add a path that bypasses it.
- Each Workspace package exports a `WorkspaceModule` (`libs/views/src/component/WorkspaceModule.ts`) with routes relative to its base path; `core-ui/src/workspaces.tsx` registers them.
- IDs in table cells that must not wrap (run ids, trace ids) use a module class with `white-space: nowrap` and `@include type-style('code-01')`.
- Real OIDC login is not wired yet — the persona picker is demo-only; do not build on it.

## Testing

- `pnpm --filter @workspacenow/mock-server test` — vitest contract tests in `platform.test.ts` and `authorization.test.ts`; extend it when the mock changes.
- No coverage instrumentation yet (no vitest coverage provider installed); typecheck + eslint + mock tests are the gates.
- Run one: `pnpm --filter @workspacenow/mock-server test -t <name>`.

## Done checklist

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` pass (`pnpm build` too if the shell changed).
- [ ] Mock-server mirrors any contract change; its tests cover the new behavior.
- [ ] `../docs/TODO.md` / `../docs/COVERAGE.md` updated if behavior moved.
