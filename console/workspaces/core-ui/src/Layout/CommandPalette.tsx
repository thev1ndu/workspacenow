import { Flow, DataBase, OverflowMenuHorizontal, Bot, Home, Link as LinkIcon, User, Plug, Network_3, TextAlignLeft } from "@carbon/react/icons";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ComposedModal, ContainedList, ContainedListItem, InlineLoading, ModalBody, ModalHeader, Search } from "@carbon/react";
import { useNavigate } from "react-router-dom";
import { useListApplications, useSearch } from "@workspacenow/api-client";
import { AppIcon, usePinnedApplicationIds } from "@workspacenow/studio";
import { buildPath, routes, type SearchHit } from "@workspacenow/types";
import type { WorkspaceModule } from "@workspacenow/views";
import { useT } from "@workspacenow/i18n";
import styles from "./CommandPalette.module.scss";

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
  application: <OverflowMenuHorizontal />,
  record: <TextAlignLeft />,
  user: <User />,
  entity: <DataBase />,
  agent: <Bot />,
  workflow: <Flow />,
  api: <LinkIcon />,
  "mcp-server": <Network_3 />,
  integration: <Plug />,
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
    { id: "page:/", title: "Home", href: routes.home, icon: <Home /> },
    ...workspaces.flatMap((w) =>
      w.navigation.map((n) => ({
        id: `page:${n.href}`,
        title: n.end ? w.title : `${w.title} / ${n.label}`,
        subtitle: n.end ? "Workspace" : "Page",
        href: n.href,
        icon: w.icon,
      })),
    ),
  ];
}

/** Opens with Cmd+K / Ctrl+K anywhere: jump to any page, or search everything the user can see. */
export function CommandPalette({ workspaces, isOpen, onOpenChange }: { workspaces: WorkspaceModule[]; isOpen: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const results = useRef<HTMLDivElement>(null);
  const debounced = useDebounced(query, 150);
  const search = useSearch(debounced);
  const applications = useListApplications();
  const pinnedIds = usePinnedApplicationIds();

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
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
  const pages = pageItems(workspaces).filter((p) => !term || term.split(/\s+/).every((word) => p.title.toLowerCase().includes(word)));
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

  const rows = () => Array.from(results.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
  const onSearchKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      rows()[0]?.focus();
    } else if (event.key === "Enter") {
      const first = visible[0]?.items[0];
      if (first) pick(first);
    } else if (event.key === "Escape" && !query) {
      // Search keeps Escape for clearing its text; an empty field means the user wants out.
      onOpenChange(false);
    }
  };
  const onResultsKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const all = rows();
    const index = all.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "ArrowUp" && index <= 0) document.getElementById("command-palette-search")?.focus();
    else all[Math.min(all.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))]?.focus();
  };

  return (
    <ComposedModal open={isOpen} onClose={() => onOpenChange(false)} size="md" aria-label={t("Search")} selectorPrimaryFocus="#command-palette-search">
      <ModalHeader title={t("Search")} closeModal={() => onOpenChange(false)} />
      <ModalBody className={styles.body}>
        <div className={styles.field}>
          <Search
            id="command-palette-search"
            labelText="Search everything"
            placeholder="Search apps, records, people, agents, pages"
            size="lg"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
          />
          {search.isFetching && <InlineLoading description={t("Searching")} />}
        </div>
        <div ref={results} className={styles.results} onKeyDown={onResultsKeyDown}>
          {visible.length === 0 ? (
            <p className={styles.empty}>{search.isFetching ? "Searching" : `No results for "${query.trim()}"`}</p>
          ) : (
            visible.map((section) => (
              <ContainedList key={section.label} kind="disclosed" label={section.label}>
                {section.items.map((item) => (
                  <ContainedListItem key={item.id} renderIcon={() => <>{item.icon}</>} onClick={() => pick(item)}>
                    <span className={styles.title}>{item.title}</span>
                    {item.subtitle && <span className={styles.subtitle}>{item.subtitle}</span>}
                  </ContainedListItem>
                ))}
              </ContainedList>
            ))
          )}
        </div>
        <p className={styles.hints}>
          <span>
            <kbd>Up</kbd> <kbd>Down</kbd> to navigate
          </span>
          <span>
            <kbd>Enter</kbd> to open
          </span>
          <span>
            <kbd>Esc</kbd> to close
          </span>
        </p>
      </ModalBody>
    </ComposedModal>
  );
}
