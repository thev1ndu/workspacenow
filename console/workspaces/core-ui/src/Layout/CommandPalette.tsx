import { useEffect, useState, type ReactNode } from "react";
import { Loading, Modal, Search } from "@carbon/react";
import {
  BranchesRight,
  Database,
  DotsNine,
  FaceRobot,
  House,
  Link as LinkIcon,
  Person,
  PlugConnection,
  Server,
  TextAlignLeft,
} from "@workspacenow/icons";
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
  application: <DotsNine />,
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

function Row({ item, onPick }: { item: Item; onPick: (item: Item) => void }) {
  return (
    <li>
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-default"
        onClick={() => onPick(item)}
      >
        <span className="text-muted [&_svg]:size-4">{item.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-foreground">{item.title}</span>
          {item.subtitle && <span className="block truncate text-xs text-muted">{item.subtitle}</span>}
        </span>
      </button>
    </li>
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

  const pick = (item: Item) => {
    onOpenChange(false);
    navigate(item.href);
  };

  return (
    <Modal
      open={isOpen}
      onRequestClose={() => onOpenChange(false)}
      modalHeading=""
      passiveModal
      size="lg"
      className="mt-[12vh]"
      aria-label="Search"
    >
      <div className="flex items-center gap-2 border-b border-separator p-3">
        <Search
          id="command-palette-search"
          labelText="Search everything"
          placeholder="Search apps, records, people, agents, pages…"
          size="lg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className="flex-1"
        />
        {search.isFetching && <Loading small withOverlay={false} description="Searching" />}
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-2">
        {visible.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted">{search.isFetching ? "Searching…" : `No results for “${query.trim()}”`}</p>
        ) : (
          visible.map((section) => (
            <div key={section.label}>
              <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted">{section.label}</p>
              <ul>
                {section.items.map((item) => (
                  <Row key={item.id} item={item} onPick={pick} />
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
      <div className="flex items-center gap-4 border-t border-separator px-4 py-2 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <kbd className="rounded border border-separator bg-default px-1.5 py-0.5 font-mono">↑↓</kbd> to navigate
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="rounded border border-separator bg-default px-1.5 py-0.5 font-mono">↵</kbd> to open
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="rounded border border-separator bg-default px-1.5 py-0.5 font-mono">esc</kbd> to close
        </span>
      </div>
    </Modal>
  );
}
