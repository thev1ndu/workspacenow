import { Download, ArrowUp, Add, AiGenerate, List } from "@carbon/react/icons";
import { useId, useState } from "react";
import { Button, InlineNotification, Select, SelectItem } from "@carbon/react";

import { useNavigate, useParams } from "react-router-dom";
import { useAuthHooks } from "@workspacenow/auth";
import { exportRecords, useCreateRecord, useGetEntity, useListEntities, useListRecords, useListViews } from "@workspacenow/api-client";
import { ApiError, buildPath, routes } from "@workspacenow/types";
import { LinkButton, NoDataFound, PageLayout, QueryState, SectionCard, useDebouncedValue } from "@workspacenow/views";
import { ImportDialog } from "./subComponents/ImportDialog";
import { RecordFormDialog, useReferenceLabels } from "./subComponents/RecordForm";
import { ViewBuilderDialog } from "./subComponents/ViewBuilderDialog";
import { AskViewDialog } from "./subComponents/AskViewDialog";
import { RecordsManager } from "./subComponents/RecordsManager";

import styles from "./RecordsPage.module.scss";

const PAGE_SIZE = 15;

export function RecordsPage() {
  const { entityName } = useParams();
  const navigate = useNavigate();
  const entitySelectId = useId();
  const viewSelectId = useId();
  const entities = useListEntities();
  const entity = useGetEntity({ entityName });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewId, setViewId] = useState<string>();
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const q = useDebouncedValue(search.trim());
  const records = useListRecords({ entityName, q: viewId ? undefined : q || undefined, view: viewId, includeDeleted, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
  const views = useListViews({ entityName });
  // A new search or page key has no data yet; keep showing the previous rows so the toolbar search keeps focus while typing.
  const [kept, setKept] = useState<{ entityName?: string; data: NonNullable<typeof records.data> }>();
  if (records.data && kept?.data !== records.data) setKept({ entityName, data: records.data });
  const listing = records.data ?? (kept && kept.entityName === entityName ? kept.data : undefined);
  const listingQuery = { data: listing, isLoading: records.isLoading && !listing, error: records.error };
  const { getToken } = useAuthHooks();
  const download = async (format: "json" | "csv") => {
    if (!entityName) return;
    const { body, contentType } = await exportRecords({ entityName, format, view: viewId }, getToken);
    const url = URL.createObjectURL(new Blob([body], { type: contentType }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entityName.toLowerCase()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const labels = useReferenceLabels(entity.data);
  const createRecord = useCreateRecord();
  const [creating, setCreating] = useState(false);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const readOnly = entity.data?.scope === "external";
  const missing = !entityName || (entity.error instanceof ApiError && entity.error.status === 404);

  return (
    <PageLayout
      title={`${entity.data?.label ?? entityName} records`}
      description="Every read and write here runs as you, through the entity's governed operations."
      backHref={entityName ? buildPath(routes.data.entity, { entityName }) : routes.data.entities}
      backLabel={entity.data?.label ?? "Entity"}
      actions={
        <>
          <Select
            id={entitySelectId}
            labelText="Entity"
            hideLabel
            aria-label="Entity"
            className={styles.entitySelect}
            value={entityName ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v) navigate(buildPath(routes.data.records, { entityName: v }));
            }}
          >
            {entities.data === undefined && <SelectItem value="" text="Entity" disabled />}
            {(entities.data?.items ?? []).map((e) => (
              <SelectItem key={e.name} value={e.name} text={e.label} />
            ))}
          </Select>
          <Select
            id={viewSelectId}
            labelText="Saved view"
            hideLabel
            aria-label="Saved view"
            className={styles.viewSelect}
            value={viewId ?? ""}
            onChange={(e) => { setViewId(e.target.value || undefined); setPage(1); }}
          >
            <SelectItem value="" text="All records" />
            {(views.data?.items ?? []).map((v) => (
              <SelectItem key={v.id} value={v.id} text={v.name} />
            ))}
          </Select>
          <Button kind="tertiary" onClick={() => download("csv")} disabled={!entity.data} renderIcon={Download}>
            Export CSV
          </Button>
          <Button kind="tertiary" onClick={() => setViewsOpen(true)} disabled={!entity.data} renderIcon={List}>
            Views
          </Button>
          <Button kind="secondary" onClick={() => setAskOpen(true)} disabled={!entity.data} renderIcon={AiGenerate}>
            Ask
          </Button>
          {!readOnly && (
            <Button kind="tertiary" onClick={() => setImportOpen(true)} disabled={!entity.data} renderIcon={ArrowUp}>
              Import
            </Button>
          )}
          <Button kind="tertiary" onClick={() => setIncludeDeleted((v) => !v)}>
            {includeDeleted ? "Hide deleted" : "Show deleted"}
          </Button>
          {!readOnly && (
            <Button kind="primary" onClick={() => setCreating(true)} disabled={!entity.data} renderIcon={Add}>
              New record
            </Button>
          )}
        </>
      }
    >
      {readOnly && (
        <div className={styles.notice}>
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title={`${entity.data?.label} is owned by an external system. WorkspaceNow reads it through a connection and cannot change it.`}
          />
        </div>
      )}
      <SectionCard flush>
        {missing ? (
          <NoDataFound
            message={entityName ? `The entity "${entityName}" no longer exists. It may have been renamed or deleted.` : "Choose an entity to browse its records."}
            action={
              <LinkButton size="sm" variant="secondary" href={routes.data.entities}>
                Go to entities
              </LinkButton>
            }
          />
        ) : (
          <QueryState query={entity}>
            {(ent) => (
              <QueryState query={listingQuery}>
                {(data) => (
                  <RecordsManager
                    entity={ent}
                    records={data.items}
                    labels={labels}
                    search={search}
                    onSearchChange={(v) => {
                      setSearch(v);
                      setPage(1);
                    }}
                    page={page}
                    total={data.total}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPage}
                  />
                )}
              </QueryState>
            )}
          </QueryState>
        )}
      </SectionCard>
      {entity.data && creating && (
        <RecordFormDialog
          open
          entity={entity.data}
          onClose={() => {
            setCreating(false);
            createRecord.reset();
          }}
          isPending={createRecord.isPending}
          error={createRecord.error}
          onSubmit={(values) => createRecord.mutate({ entityName: entity.data!.name, values }, { onSuccess: () => setCreating(false) })}
        />
      )}
      {viewsOpen && entity.data && <ViewBuilderDialog entity={entity.data} onClose={() => setViewsOpen(false)} />}
      {askOpen && entity.data && (
        <AskViewDialog
          entity={entity.data}
          onClose={() => setAskOpen(false)}
          onCreated={(view) => { setViewId(view.id); setPage(1); }}
        />
      )}
      {importOpen && entity.data && <ImportDialog entity={entity.data} onClose={() => setImportOpen(false)} />}
    </PageLayout>
  );
}
