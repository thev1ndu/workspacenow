import { Alert, Chip, Tabs } from "@heroui/react";
import { FileText, LayoutCells, QrCode, ShoppingCart, SquareChartColumn } from "@workspacenow/icons";
import { useSearchParams } from "react-router-dom";
import { useListRecords } from "@workspacenow/api-client";
import type { Application } from "@workspacenow/types";
import { NoDataFound } from "@workspacenow/views";
import { PreviewPageRenderer } from "../subComponents/PreviewPageRenderer";

const PAGE_ICON = { list: LayoutCells, form: FileText, dashboard: SquareChartColumn, scan: QrCode, pos: ShoppingCart };

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
  const page = app.pages.find((p) => p.id === params.get("page")) ?? app.pages[0];

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
            {app.pages.map((p) => {
              const Icon = PAGE_ICON[p.kind];
              return (
                <Tabs.Tab key={p.id} id={p.id}>
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {p.title}
                  {p.kind === "list" && p.entity && <TabCount entityName={p.entity} />}
                  <Tabs.Indicator />
                </Tabs.Tab>
              );
            })}
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
