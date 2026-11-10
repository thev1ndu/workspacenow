import { useRef, useState } from "react";
import { InlineNotification, Tab, TabList, TabPanel, TabPanels, Tabs, Tag } from "@carbon/react";
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
    <Tag size="sm" type="gray" className="tabular-nums">
      {records.data.total}
    </Tag>
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
  // Bind native HTML5 drag & drop on the tab element via ref, since Tab does not forward drag props.
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

  const selectedIndex = Math.max(0, ordered.findIndex((p) => p.id === page.id));

  return (
    // A single shrinkable column, so wide content scrolls inside its own box instead of widening the page on phones.
    <div className="grid grid-cols-1 gap-6">
      {app.lifecycle === "draft" && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="Draft application: records you create here are real, but the application is not deployed yet."
        />
      )}

      <Tabs
        selectedIndex={selectedIndex}
        onChange={({ selectedIndex: next }) =>
          setParams(
            (current) => {
              const nextPage = ordered[next];
              if (nextPage) current.set("page", nextPage.id);
              return current;
            },
            { replace: true },
          )
        }
      >
        <TabList aria-label={`${app.name} pages`} className="max-w-full self-start overflow-x-auto">
          {ordered.map((p) => (
            <Tab
              key={p.id}
              ref={bindDrag(p.id)}
              className={dragId === p.id ? "opacity-50" : "cursor-grab active:cursor-grabbing"}
            >
              {p.title}
              {p.kind === "list" && p.entity && <TabCount entityName={p.entity} />}
            </Tab>
          ))}
        </TabList>
        <TabPanels>
          {app.pages.map((p) => (
            <TabPanel key={p.id} className="mt-5">
              {p.id === page.id && <PreviewPageRenderer page={p} qrField={app.pages.find((s) => s.kind === "scan" && s.entity === p.entity)?.scan?.matchField} />}
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </div>
  );
}
