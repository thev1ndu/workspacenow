# WorkspaceNow console UI guide

Every screen is built from **IBM Carbon** (`@carbon/react`) components. Layout/styling uses the app's own
utility classes (`apps/web-ui/src/utilities.scss`), which are mapped onto Carbon theme variables
(`--cds-*`) — e.g. `text-foreground`, `text-muted`, `bg-background`, `bg-surface`, `bg-surface-secondary`,
`border-separator`, `bg-default`, and status colours `text-success` / `text-warning` / `text-danger` /
`text-accent`. Never use hex colours; light and dark both come from the Carbon theme (`cds--white` /
`cds--g100` on `<html>`, plus `data-palette` accent overrides in `themes.scss`).
Charts are **EvilCharts** (Recharts) from `@workspacenow/charts`. Icons come only from `@carbon/react/icons`.
No raw `<button>`, `<input>`, `<select>` or `<table>` outside Carbon components and the views wrappers.

## Shared primitives (`@workspacenow/views`)

| Need | Use |
|---|---|
| Page frame, title, description, back link, actions | `PageLayout` |
| A titled block; `flush` for tables and lists | `SectionCard` |
| Headline number | `Metric` (Carbon icon, `size` handled) |
| Lifecycle / outcome state | `StatusChip status="…"` (Carbon `Tag`, tone from the status) |
| Neutral tag | `<Tag size="sm" type="gray">` |
| Label/value pairs | `DetailList` (`fullWidth` for long values) |
| Loading / error / forbidden | `QueryState` (skeletons, Carbon `InlineNotification`) |
| Empty | `NoDataFound` |
| Text and select fields | `TextInput`, `SelectInput` |
| JSON | `JsonView` |
| Who acted | `ActorLabel` |
| In-text navigation | `TextLink to=…` |
| Navigation styled as a button | `LinkButton href=… variant=…` (router link with Carbon button classes) |
| Notifications | `useSnackBar().pushSnackBar(message, severity)` (Carbon `ToastNotification`) |

## Carbon patterns

- **Buttons:** Carbon `Button` with `kind` — `primary` (one per context), `secondary`, `tertiary`,
  `ghost`, `danger`, `danger--ghost`, `danger--tertiary`. Use `onClick`, `disabled`, and
  `hasIconOnly` + `iconDescription` for icon-only buttons. Icons as children work; for leading icons
  use `renderIcon={(p) => <Icon className="size-4" {...p} />}`. No `href` on buttons — use `LinkButton`.
- **Tables:** `TableContainer` (aria-label) > `Table` > `TableHead` > `TableRow` > `TableHeader scope="col"`
  (first one `scope="row"` for row headers), `TableBody` > `TableRow key id` > `TableCell`.
  Put tables in `SectionCard flush` with a `TablePager` under them.
- **Tabs:** Carbon v11 API — `<Tabs><TabList aria-label><Tab>…</Tab></TabList><TabPanels><TabPanel>…</TabPanel></TabPanels></Tabs>`.
  Selection is index-based (`selectedIndex`/`onChange` or `defaultSelectedIndex`).
- **Dialogs:** Carbon `Modal` with `open`, `onRequestClose`, `modalHeading`, `size="md"|"lg"`,
  `hasScrollingContent` for long bodies, `passiveModal` when you render your own footer buttons.
  Simple confirmations can use `primaryButtonText`/`secondaryButtonText` + `onRequestSubmit`/`onSecondarySubmit`.
- **Notifications inline:** `InlineNotification` with `kind` (`info`/`success`/`warning`/`error`),
  `title`, `subtitle`, `lowContrast`, `hideCloseButton`.
- **Toasts:** `useSnackBar().pushSnackBar(...)` (see above).
- **Menus:** Carbon `OverflowMenu` + `OverflowMenuItem`, or `Dropdown` with `items`.
- **Toggles and choices:** Carbon `Toggle`, `Checkbox`, `CheckboxGroup`, `RadioButtonGroup`, `Select` + `SelectItem`.
- **Tooltips:** plain `title` attribute for text hints; Carbon `Tooltip` only for icon-only buttons.
- **Forms:** Carbon `Form`/`TextInput`/`TextArea`/`Select` with `labelText`, `helperText`, `invalid` + `invalidText`
  (see `views` `FormElements.tsx` for the wrapped pattern).

Read the component's page before using it: the Carbon v11 docs are mirrored in `docs/CARBON.md`
(install/usage notes for `@carbon/react`, `@carbon/styles`, themes, icons).

## Charts

```tsx
const config = { calls: { label: "Calls", colors: { light: ["var(--cds-interactive)"], dark: ["var(--cds-interactive)"] } } } satisfies ChartConfig;
<EvilBarChart config={config} data={rows} className="aspect-auto h-56 flex-none">
  <EvilBarChart.Grid vertical={false} />
  <EvilBarChart.XAxis dataKey="date" />
  <EvilBarChart.YAxis width={36} />
  <EvilBarChart.Tooltip />
  <EvilBarChart.Legend align="left" />
  <EvilBarChart.Bar dataKey="calls" />
</EvilBarChart>
```

- `flex-none` is required: the chart container is `flex-1` and collapses to zero height inside a card otherwise.
- Row types must be `type` aliases, not interfaces, to satisfy the chart's data type.
- Colour series with tokens (`var(--cds-interactive)`, `var(--cds-support-success)`, `var(--cds-support-warning)`, `var(--cds-support-error)`, `var(--cds-text-secondary)`).
- Only chart something a reader would act on; one chart per question.

## Writing

Sentence case everywhere, no all-caps labels, no exclamation marks, no gradients, no decorative icon tiles.
Icons are `size-4` (inline `size-3.5`) and take their colour from the text; decorative icons are `text-muted`.
Identifiers in `font-mono`; numbers `tabular-nums`.
