import { useState } from "react";
import { Button, Table } from "@heroui/react";
import { Plus, Sparkles } from "@workspacenow/icons";
import { useCan, useListApplications, useListEntities } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { NoDataFound, PageLayout, QueryState, SectionCard, StatusChip, TextLink } from "@workspacenow/views";
import { NewEntityDialog } from "./subComponents/NewEntityDialog";
import { InferEntityDialog } from "./subComponents/InferEntityDialog";
import { ScopeChip } from "./subComponents/ScopeChip";

export function EntitiesPage() {
  const entities = useListEntities();
  const { data: apps } = useListApplications();
  const canManage = useCan("data.manage");
  const [open, setOpen] = useState(false);
  const [inferOpen, setInferOpen] = useState(false);
  const appName = (id?: string) => apps?.items.find((a) => a.id === id)?.name ?? "—";

  return (
    <PageLayout
      title="Entities"
      description="Each entity is a business-level contract. The Entity Runtime decides how it is stored."
      actions={
        <>
          {canManage && (
            <Button variant="secondary" onPress={() => setInferOpen(true)}>
              <Sparkles className="size-4" aria-hidden />
              New from data
            </Button>
          )}
          <Button onPress={() => setOpen(true)} isDisabled={!canManage}>
            <Plus className="size-4" aria-hidden />
            New entity
          </Button>
        </>
      }
    >
      <SectionCard flush>
        <QueryState query={entities}>
          {(data) =>
            data.items.length === 0 ? (
              <NoDataFound message="No entities defined yet." />
            ) : (
              <Table variant="secondary">
                <Table.ScrollContainer>
                  <Table.Content aria-label="Entities" className="min-w-[860px]">
                    <Table.Header>
                      <Table.Column isRowHeader>Name</Table.Column>
                      <Table.Column>Scope</Table.Column>
                      <Table.Column>Owner</Table.Column>
                      <Table.Column className="text-right">Fields</Table.Column>
                      <Table.Column>Events</Table.Column>
                      <Table.Column>Read / write</Table.Column>
                      <Table.Column>Version</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {data.items.map((e) => (
                        <Table.Row key={e.id} id={e.id}>
                          <Table.Cell>
                            <TextLink to={buildPath(routes.data.entity, { entityName: e.name })}>{e.label}</TextLink>
                            <p className="font-mono text-xs text-muted">{e.name}</p>
                          </Table.Cell>
                          <Table.Cell>
                            <ScopeChip scope={e.scope} />
                          </Table.Cell>
                          <Table.Cell className="text-muted">{appName(e.ownerApplicationId)}</Table.Cell>
                          <Table.Cell className="text-right tabular-nums">{e.fields.length}</Table.Cell>
                          <Table.Cell className="text-xs text-muted">
                            {e.events.length ? e.events.map((ev) => ev.split(".")[1]).join(", ") : "—"}
                          </Table.Cell>
                          <Table.Cell className="font-mono text-xs">
                            <div>{e.readPermission}</div>
                            <div className="text-muted">{e.writePermission}</div>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <span className="tabular-nums">v{e.version}</span>
                              <StatusChip status={e.lifecycle} />
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            )
          }
        </QueryState>
      </SectionCard>
      <NewEntityDialog open={open} onClose={() => setOpen(false)} />
      {inferOpen && <InferEntityDialog onClose={() => setInferOpen(false)} />}
    </PageLayout>
  );
}
