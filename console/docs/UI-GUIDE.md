# WorkspaceNow console UI guide

Every screen is built from **HeroUI v3** (`@heroui/react`) components and Tailwind utilities that use HeroUI's
design tokens. Charts are **EvilCharts** (Recharts) from `@workspacenow/charts`. Icons are `@gravity-ui/icons` only.
No other component or icon library, no raw `<button>`, `<input>`, `<select>` or `<table>`.

## Tokens

Use HeroUI's semantic classes, never hex colours: `text-foreground`, `text-muted`, `bg-background`, `bg-surface`,
`bg-surface-secondary`, `border-separator`, `bg-default`, and status colours `text-success` / `text-warning` /
`text-danger` / `text-accent`. Light and dark both come from these tokens.

## Shared primitives (`@workspacenow/views`)

| Need | Use |
|---|---|
| Page frame, title, description, back link, actions | `PageLayout` |
| A titled block; `flush` for tables and lists | `SectionCard` |
| Headline number | `Metric` (neutral icon from gravity, `size` handled) |
| Lifecycle / outcome state | `StatusChip status="…"` (soft chip, tone from the status) |
| Neutral tag | `<Chip size="sm" variant="secondary">` |
| Label/value pairs | `DetailList` (`fullWidth` for long values) |
| Loading / error / forbidden | `QueryState` (skeletons, HeroUI `Alert`) |
| Empty | `NoDataFound` (HeroUI `EmptyState`) |
| Text and select fields | `TextInput`, `SelectInput` |
| JSON | `JsonView` |
| Who acted | `ActorLabel` |
| In-text navigation | `TextLink to=…` |
| Navigation styled as a button | `LinkButton href=… variant=…` (HeroUI `Link` + `buttonVariants`) |
| Notifications | `useSnackBar().pushSnackBar(message, severity)` (HeroUI toast) |

## HeroUI patterns

- **Buttons:** `variant` is `primary` (one per context), `secondary`, `tertiary`, `ghost`, `danger`, `danger-soft`.
  Use `onPress`, `isPending`, `isDisabled`, `isIconOnly` + `aria-label`. HeroUI `Button` has no `href`; use `LinkButton`.
- **Tables:** `<Table><Table.ScrollContainer><Table.Content aria-label=…>` → `Table.Header` with `Table.Column`
  (first one `isRowHeader`) → `Table.Body` with `<Table.Row key id>` and `Table.Cell`. Put tables in `SectionCard flush`.
- **Tabs:** `Tabs` → `Tabs.ListContainer` → `Tabs.List aria-label` → `<Tabs.Tab id>label<Tabs.Indicator /></Tabs.Tab>`,
  then `<Tabs.Panel id>`.
- **Dialogs:** `Modal` (trigger as first child), or controlled with `<Modal.Backdrop isOpen onOpenChange>` and no root.
  Same for `Drawer`. Inside: `Modal.Container` → `Modal.Dialog` → `Modal.Header`/`Modal.Heading`, `Modal.Body`, `Modal.Footer`.
- **Tooltips:** `<Tooltip><Button…/><Tooltip.Content>…</Tooltip.Content></Tooltip>`; wrap non-pressable content in
  `Tooltip.Trigger`.
- **Menus:** `Dropdown` → trigger `Button` → `Dropdown.Popover` → `Dropdown.Menu onAction` → `Dropdown.Item id textValue`
  with `Label`/`Description`; group with `Dropdown.Section` and `Header`.
- **Toggles and choices:** HeroUI `Switch`, `Checkbox`, `CheckboxGroup`, `RadioGroup`.

Read the component's page before using it: the HeroUI v3 docs are mirrored at
`https://heroui.com/react/llms-full.txt` (one `<page>` per component).

## Charts

```tsx
const config = { calls: { label: "Calls", colors: { light: ["var(--accent)"], dark: ["var(--accent)"] } } } satisfies ChartConfig;
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
- Colour series with tokens (`var(--accent)`, `var(--success)`, `var(--warning)`, `var(--danger)`, `var(--muted)`).
- Only chart something a reader would act on; one chart per question.

## Writing

Sentence case everywhere, no all-caps labels, no exclamation marks, no gradients, no decorative icon tiles.
Icons are `size-4` (inline `size-3.5`) and take their colour from the text; decorative icons are `text-muted`.
Identifiers in `font-mono`; numbers `tabular-nums`.
