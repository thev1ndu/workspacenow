import { useEffect, useState, type ReactNode } from "react";
import { Header, Kbd, ListBox, Modal, SearchField, Spinner } from "@heroui/react";
import {
  BranchesRight,
  Database,
  FaceRobot,
  House,
  LayoutHeaderCellsLarge,
  Link as LinkIcon,
  Person,
  PlugConnection,
  Server,
  TextAlignLeft,
} from "@workspacenow/icons";
import { Autocomplete } from "react-aria-components";
import { useNavigate } from "react-router-dom";
import { useListApplications, useSearch } from "@workspacenow/api-client";
import { AppIcon, usePinnedApplicationIds } from "@workspacenow/studio";
import { buildPath, routes, type SearchHit } from "@workspacenow/types";
import type { WorkspaceModule } from "@workspacenow/views";

interface Item {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  icon: ReactNode;
}

const GROUPS: Array<{ type: SearchHit["type"]; label: string }> = [
  { type: "application", label: "Applications" },
  { type: "record", label: "Records" },
  { type: "user", label: "People" },
  { type: "entity", label: "Entities" },
  { type: "agent", label: "Agents" },
  { type: "workflow", label: "Workflows" },
  { type: "api", label: "APIs" },
  { type: "mcp-server", label: "MCP servers" },
  { type: "integration", label: "Integrations" },
];

const HIT_ICON: Record<SearchHit["type"], ReactNode> = {
  application: <LayoutHeaderCellsLarge />,
  record: <TextAlignLeft />,
  user: <Person />,
  entity: <Database />,
  agent: <FaceRobot />,
  workflow: <BranchesRight />,
  api: <LinkIcon />,
  "mcp-server": <Server />,
  integration: <PlugConnection />,
};

function hrefFor(hit: SearchHit): string {
  switch (hit.type) {
    case "application":
      return buildPath(routes.app, { appId: hit.id });
    case "record":
      return hit.appId
        ? `${buildPath(routes.app, { appId: hit.appId })}?page=${encodeURIComponent(hit.pageId ?? "")}`
        : buildPath(routes.data.records, { entityName: hit.entity ?? "" });
    case "user":
      return routes.control.organization;
    case "entity":
      return buildPath(routes.data.entity, { entityName: hit.id });
    case "agent":
      return buildPath(routes.ai.agent, { agentId: hit.id });
    case "workflow":
      return buildPath(routes.flow.workflow, { workflowId: hit.id });
    case "api":
      return buildPath(routes.connect.api, { apiId: hit.id });
    case "mcp-server":
      return routes.connect.mcp;
    case "integration":
      return routes.connect.integrations;
  }
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

/** Every page in the console, for "go to" results. */
function pageItems(workspaces: WorkspaceModule[]): Item[] {
  return [
    { id: "page:/", title: "Home", href: routes.home, icon: <House /> },
    ...workspaces.flatMap((w) =>
      w.navigation.map((n) => ({
        id: `page:${n.href}`,
        title: n.end ? w.title : `${w.title} › ${n.label}`,
        subtitle: n.end ? "Workspace" : "Page",
        href: n.href,
        icon: w.icon,
      })),
    ),
  ];
}

function Row({ item }: { item: Item }) {
  return (
    <ListBox.Item id={item.id} textValue={item.title} className="gap-3">
      <span className="text-muted [&_svg]:size-4">{item.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-foreground">{item.title}</span>
        {item.subtitle && <span className="block truncate text-xs text-muted">{item.subtitle}</span>}
      </span>
    </ListBox.Item>
  );
}

/** Opens with ⌘K / Ctrl+K anywhere: jump to any page, or search everything the user can see. */
export function CommandPalette({ workspaces, isOpen, onOpenChange }: { workspaces: WorkspaceModule[]; isOpen: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query, 150);
  const search = useSearch(debounced);
  const applications = useListApplications();
  const pinnedIds = usePinnedApplicationIds();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!isOpen);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  const term = query.trim().toLowerCase();
  const pages = pageItems(workspaces).filter((p) => !term || term.split(/\s+/).every((t) => p.title.toLowerCase().includes(t)));
  const pinned: Item[] = pinnedIds.flatMap((id) =>
    (applications.data?.items ?? [])
      .filter((a) => a.id === id)
      .map((a) => ({ id: `pin:${a.id}`, title: a.name, subtitle: "Pinned app", href: buildPath(routes.app, { appId: a.id }), icon: <AppIcon app={a} size="xs" /> })),
  );
  const hits = term && debounced.trim() ? (search.data?.items ?? []) : [];
  const sections: Array<{ label: string; items: Item[] }> = term
    ? [
        ...GROUPS.map((g) => ({
          label: g.label,
          items: hits
            .filter((h) => h.type === g.type)
            .map((h) => ({ id: `${h.type}:${h.id}`, title: h.title, subtitle: h.subtitle, href: hrefFor(h), icon: HIT_ICON[h.type] })),
        })),
        { label: "Go to", items: pages.slice(0, 6) },
      ]
    : [
        { label: "Pinned apps", items: pinned },
        { label: "Go to", items: pages },
      ];
  const visible = sections.filter((s) => s.items.length > 0);
  const byId = new Map(visible.flatMap((s) => s.items.map((i) => [i.id, i] as const)));

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container size="lg" placement="top" className="mt-[12vh]">
        <Modal.Dialog aria-label="Search" className="overflow-hidden p-0">
          <Autocomplete inputValue={query} onInputChange={setQuery}>
            <div className="flex items-center gap-2 border-b border-separator p-3">
              <SearchField aria-label="Search everything" autoFocus fullWidth variant="secondary">
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder="Search apps, records, people, agents, pages…" />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>
              {search.isFetching && <Spinner size="sm" />}
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              <ListBox
                aria-label="Results"
                renderEmptyState={() => (
                  <p className="px-3 py-8 text-center text-sm text-muted">{search.isFetching ? "Searching…" : `No results for “${query.trim()}”`}</p>
                )}
                onAction={(key) => {
                  const item = byId.get(String(key));
                  if (!item) return;
                  onOpenChange(false);
                  navigate(item.href);
                }}
              >
                {visible.map((section) => (
                  <ListBox.Section key={section.label} id={section.label}>
                    <Header className="px-3 pt-2 pb-1 text-xs font-medium text-muted">{section.label}</Header>
                    {section.items.map((item) => (
                      <Row key={item.id} item={item} />
                    ))}
                  </ListBox.Section>
                ))}
              </ListBox>
            </div>
            <div className="flex items-center gap-4 border-t border-separator px-4 py-2 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <Kbd>↑↓</Kbd> to navigate
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>↵</Kbd> to open
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>esc</Kbd> to close
              </span>
            </div>
          </Autocomplete>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
