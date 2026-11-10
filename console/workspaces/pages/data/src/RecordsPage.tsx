import { useState } from "react";
import { Alert, Button, ListBox, Select } from "@heroui/react";
import { ArrowDownToLine, ArrowUp, Plus, Sparkles, SquareListUl } from "@workspacenow/icons";
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

const PAGE_SIZE = 15;

export function RecordsPage() {
  const { entityName } = useParams();
  const navigate = useNavigate();
  const entities = useListEntities();
  const entity = useGetEntity({ entityName });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewId, setViewId] = useState<string>();
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const q = useDebouncedValue(search.trim());
  const records = useListRecords({ entityName, q: viewId ? undefined : q || undefined, view: viewId, includeDeleted, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
  const views = useListViews({ entityName });
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
          <Select variant="secondary"
            aria-label="Entity"
            className="w-52"
            value={entities.data ? (entityName ?? null) : null}
            onChange={(key) => key != null && navigate(buildPath(routes.data.records, { entityName: String(key) }))}
            placeholder="Entity"
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {(entities.data?.items ?? []).map((e) => (
                  <ListBox.Item key={e.name} id={e.name} textValue={e.label}>
                    {e.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <Select variant="secondary"
            aria-label="Saved view"
            className="w-44"
            value={viewId ?? null}
            onChange={(key) => { setViewId(key ? String(key) : undefined); setPage(1); }}
            placeholder="All records"
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="" textValue="All records">
                  All records
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                {(views.data?.items ?? []).map((v) => (
                  <ListBox.Item key={v.id} id={v.id} textValue={v.name}>
                    {v.name}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <Button variant="tertiary" onPress={() => download("csv")} isDisabled={!entity.data}>
            <ArrowDownToLine className="size-4" aria-hidden />
            Export CSV
          </Button>
          <Button variant="tertiary" onPress={() => setViewsOpen(true)} isDisabled={!entity.data}>
            <SquareListUl className="size-4" aria-hidden />
            Views
          </Button>
          <Button variant="secondary" onPress={() => setAskOpen(true)} isDisabled={!entity.data}>
            <Sparkles className="size-4" aria-hidden />
            Ask
          </Button>
          {!readOnly && (
            <Button variant="tertiary" onPress={() => setImportOpen(true)} isDisabled={!entity.data}>
              <ArrowUp className="size-4" aria-hidden />
              Import
            </Button>
          )}
          <Button variant="tertiary" onPress={() => setIncludeDeleted((v) => !v)}>
            {includeDeleted ? "Hide deleted" : "Show deleted"}
          </Button>
          {!readOnly && (
            <Button onPress={() => setCreating(true)} isDisabled={!entity.data}>
              <Plus className="size-4" aria-hidden />
              New record
            </Button>
          )}
        </>
      }
    >
      {readOnly && (
        <Alert className="mb-4">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>
              {entity.data?.label} is owned by an external system. WorkspaceNow reads it through a connection and cannot change it.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      <SectionCard flush>
        {missing ? (
          <NoDataFound
            message={entityName ? `The entity "${entityName}" no longer exists. It may have been renamed or deleted.` : "Choose an entity to browse its records."}
            action={<LinkButton size="sm" variant="secondary" href={routes.data.entities}>Go to entities</LinkButton>}
          />
        ) : (
        <QueryState query={entity}>
          {(ent) => (
        <QueryState query={records}>
          {(data) =>
            ent ? (
              <RecordsManager
                entity={ent}
                records={data.items}
                labels={labels}
                search={search}
                onSearchChange={(v) => { setSearch(v); setPage(1); }}
                page={page}
                total={data.total}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            ) : null
          }
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
