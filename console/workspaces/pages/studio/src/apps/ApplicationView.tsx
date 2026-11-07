import { useRef, useState } from "react";
import { Alert, Chip, Tabs } from "@heroui/react";
import { useSearchParams } from "react-router-dom";
import { useListRecords, useSession } from "@workspacenow/api-client";
import type { Application } from "@workspacenow/types";
import { NoDataFound } from "@workspacenow/views";
import { PreviewPageRenderer } from "../subComponents/PreviewPageRenderer";

/** Record count shown beside a list page's tab; hidden when the user cannot read the entity. */
function TabCount({ entityName }: { entityName: string }) {
  const records = useListRecords({ entityName });
  if (records.data === undefined) return null;
  return (
    <Chip size="sm" variant="secondary" className="tabular-nums">
      {records.data.total}
    </Chip>
  );
}

/**
 * An application as its users see it: one tab per blueprint page, list pages with their
 * record counts. The open page lives in the URL so it survives reloads and can be shared.
 */
export function ApplicationView({ app }: { app: Application }) {
  const [params, setParams] = useSearchParams();
  const { data: session } = useSession();
  // Tab order is the user's own: drag tabs to rearrange, persisted per user and app.
  const storageKey = `wsn:app-tabs:${session?.actor.id ?? "anon"}:${app.id}`;
  const [order, setOrder] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as string[];
      const known = new Set(app.pages.map((p) => p.id));
      const kept = saved.filter((id) => known.has(id));
      return [...kept, ...app.pages.map((p) => p.id).filter((id) => !kept.includes(id))];
    } catch {
      return app.pages.map((p) => p.id);
    }
  });
  const [dragId, setDragId] = useState<string>();
  const dragIdRef = useRef<string | undefined>(undefined);
  const setDrag = (id: string | undefined) => {
    dragIdRef.current = id;
    setDragId(id);
  };
  // HeroUI/react-aria strips drag props, so bind native HTML5 drag & drop on the tab element via ref.
  const bindDrag = (id: string) => (el: Element | null) => {
    if (!el || el.getAttribute("data-dnd")) return;
    el.setAttribute("data-dnd", "1");
    el.setAttribute("draggable", "true");
    el.addEventListener("dragstart", (e) => {
      setDrag(id);
      (e as DragEvent).dataTransfer!.effectAllowed = "move";
    });
    el.addEventListener("dragover", (e) => {
      if (dragIdRef.current && dragIdRef.current !== id) e.preventDefault();
    });
    el.addEventListener("drop", (e) => {
      e.preventDefault();
      const from = dragIdRef.current;
      if (from) moveTab(from, id);
      setDrag(undefined);
    });
    el.addEventListener("dragend", () => setDrag(undefined));
  };
  const moveTab = (dragged: string, onto: string) => {
    if (dragged === onto) return;
    setOrder((prev) => {
      const next = prev.filter((id) => id !== dragged);
      next.splice(next.indexOf(onto), 0, dragged);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* private mode: order just lives for this session */
      }
      return next;
    });
  };
  const ordered = order.map((id) => app.pages.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);
  const page = ordered.find((p) => p.id === params.get("page")) ?? ordered[0];

  if (!page) return <NoDataFound message="This application has no pages yet." />;

  return (
    // A single shrinkable column, so wide content scrolls inside its own box instead of widening the page on phones.
    <div className="grid grid-cols-1 gap-6">
      {app.lifecycle === "draft" && (
        <Alert>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>Draft application: records you create here are real, but the application is not deployed yet.</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <Tabs
        variant="secondary"
        align="start"
        className="min-w-0"
        selectedKey={page.id}
        onSelectionChange={(key) =>
          setParams(
            (current) => {
              current.set("page", String(key));
              return current;
            },
            { replace: true },
          )
        }
      >
        <Tabs.ListContainer className="max-w-full self-start overflow-x-auto">
          <Tabs.List aria-label={`${app.name} pages`}>
            {ordered.map((p) => (
              <Tabs.Tab
                key={p.id}
                id={p.id}
                ref={bindDrag(p.id)}
                className={dragId === p.id ? "opacity-50" : "cursor-grab active:cursor-grabbing"}
              >
                {p.title}
                {p.kind === "list" && p.entity && <TabCount entityName={p.entity} />}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        {app.pages.map((p) => (
          <Tabs.Panel key={p.id} id={p.id} className="mt-5">
            {p.id === page.id && <PreviewPageRenderer page={p} qrField={app.pages.find((s) => s.kind === "scan" && s.entity === p.entity)?.scan?.matchField} />}
          </Tabs.Panel>
        ))}
      </Tabs>
    </div>
  );
}
