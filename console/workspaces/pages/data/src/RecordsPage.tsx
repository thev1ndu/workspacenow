import { useState } from "react";
import { Alert, Button, ListBox, Select } from "@heroui/react";
import { Plus } from "@workspacenow/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useCreateRecord, useGetEntity, useListEntities, useListRecords } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { PageLayout, QueryState, SectionCard } from "@workspacenow/views";
import { RecordFormDialog, useReferenceLabels } from "./subComponents/RecordForm";
import { RecordsManager } from "./subComponents/RecordsManager";

export function RecordsPage() {
  const { entityName } = useParams();
  const navigate = useNavigate();
  const entities = useListEntities();
  const entity = useGetEntity({ entityName });
  const records = useListRecords({ entityName });
  const labels = useReferenceLabels(entity.data);
  const createRecord = useCreateRecord();
  const [creating, setCreating] = useState(false);
  const readOnly = entity.data?.scope === "external";

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
        <QueryState query={records}>
          {(data) =>
            entity.data ? (
              <RecordsManager entity={entity.data} records={data.items} labels={labels} />
            ) : null
          }
        </QueryState>
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
    </PageLayout>
  );
}
