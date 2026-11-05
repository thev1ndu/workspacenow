# WorkspaceNow console — agent guide

React 19 + TypeScript, pnpm workspaces, Vite, TanStack Query, HeroUI v3 on Tailwind v4, EvilCharts on Recharts. Packages are scoped `@workspacenow/*`
and ship TypeScript source (`main: ./src/index.ts`), so there is no per-package build step.

- UI comes only from `@heroui/react`, charts from `@workspacenow/charts`, icons from `@gravity-ui/icons`. Follow
  `docs/UI-GUIDE.md`.
- API calls follow the two-file pattern: a pure fetch function in `libs/api-client/src/apis/<area>.ts` taking
  `getToken`, and a hook in `hooks/<area>.ts` built on `useApiQuery` / `useApiMutation`. Never call the transport from
  a component.
- Mutations refresh every query on settle: platform writes fan out through events, workflows and audit.
- Links use `routes` and `buildPath` from `@workspacenow/types`, never hand-written paths.
- Forms are manual `useState`; server state is TanStack Query; there is no global store.
- Every business write goes through `Platform.invoke` in `libs/mock-server`, which authorizes, runs, audits and then
  publishes events. Do not add a path that bypasses it.
- Each Workspace package exports a `WorkspaceModule` (`libs/views/src/component/WorkspaceModule.ts`) with routes relative
  to its base path; `core-ui/src/workspaces.tsx` registers them.

Done checklist: `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build` pass.
