import { useState } from "react";
import { Alert, Button, Chip, Table } from "@heroui/react";
import { ArrowRight, Plus, SquareListUl } from "@workspacenow/icons";
import { useParams } from "react-router-dom";
import { useCan, useGetEntity, useListApplications } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { DetailList, LinkButton, PageLayout, QueryState, SectionCard, StatusChip, TextLink, formatDateTime } from "@workspacenow/views";
import { SCOPE_EXPLANATION } from "./constants";
import { AddFieldDialog } from "./subComponents/AddFieldDialog";
import { SchemaHistoryCard } from "./subComponents/SchemaHistoryCard";
import { ScopeChip } from "./subComponents/ScopeChip";

export function EntityDetailPage() {
  const { entityName } = useParams();
  const entity = useGetEntity({ entityName });
  const { data: apps } = useListApplications();
  const canManage = useCan("data.manage");
  const [adding, setAdding] = useState(false);

  return (
    <PageLayout
      title={entity.data?.label ?? entityName ?? "Entity"}
      description={entity.data?.description}
      backHref={routes.data.entities}
      backLabel="Entities"
      isLoading={entity.isLoading}
      actions={
        entity.data && (
          <>
            {entity.data.scope !== "external" && (
              <Button variant="secondary" isDisabled={!canManage} onPress={() => setAdding(true)}>
                <Plus className="size-4" aria-hidden />
                Add field
              </Button>
            )}
            <LinkButton variant="primary" href={buildPath(routes.data.records, { entityName: entity.data.name })}>
              <SquareListUl className="size-4" aria-hidden />
              Browse records
            </LinkButton>
          </>
        )
      }
    >
      <QueryState query={entity}>
        {(e) => {
          const owner = apps?.items.find((a) => a.id === e.ownerApplicationId);
          return (
            <div className="grid gap-6">
              <SchemaHistoryCard entity={e} />
              <div className="grid items-start gap-6 md:grid-cols-[2fr_1fr]">
                <SectionCard title="Definition">
                  <DetailList
                    columns={3}
                    items={[
                      { label: "Name", value: <code className="text-xs">{e.name}</code> },
                      { label: "Scope", value: <ScopeChip scope={e.scope} /> },
                      {
                        label: "Owning application",
                        value: owner ? <TextLink to={buildPath(routes.studio.application, { appId: owner.id })}>{owner.name}</TextLink> : "—",
                      },
                      { label: "Read permission", value: <code className="text-xs">{e.readPermission}</code> },
                      { label: "Write permission", value: <code className="text-xs">{e.writePermission}</code> },
                      {
                        label: "Version",
                        value: (
                          <span className="flex items-center gap-2">
                            <span className="tabular-nums">v{e.version}</span>
                            <StatusChip status={e.lifecycle} />
                          </span>
                        ),
                      },
                      { label: "Updated", value: formatDateTime(e.updatedAt) },
                    ]}
                  />
                </SectionCard>
                <SectionCard title="Ownership">
                  <Alert status={e.scope === "external" ? "default" : "success"}>
                    <Alert.Content>
                      <Alert.Description>{SCOPE_EXPLANATION[e.scope]}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                </SectionCard>
              </div>

              <SectionCard title="Fields" subtitle={`${e.fields.length} fields`} flush>
                <Table variant="secondary">
                  <Table.ScrollContainer>
                    <Table.Content aria-label={`${e.label} fields`} className="min-w-[680px]">
                      <Table.Header>
                        <Table.Column isRowHeader>Field</Table.Column>
                        <Table.Column>Type</Table.Column>
                        <Table.Column>Required</Table.Column>
                        <Table.Column>Unique</Table.Column>
                        <Table.Column>Constraint</Table.Column>
                        <Table.Column>Default</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {e.fields.map((f) => (
                          <Table.Row key={f.name} id={f.name}>
                            <Table.Cell>
                              <p className="font-medium">{f.label}</p>
                              <p className="font-mono text-xs text-muted">{f.name}</p>
                            </Table.Cell>
                            <Table.Cell>
                              <Chip size="sm" variant="secondary">
                                {f.type}
                              </Chip>
                            </Table.Cell>
                            <Table.Cell className={f.required ? "" : "text-muted"}>{f.required ? "Yes" : "—"}</Table.Cell>
                            <Table.Cell className={f.unique ? "" : "text-muted"}>{f.unique ? "Yes" : "—"}</Table.Cell>
                            <Table.Cell>
                              {f.type === "enum" && <span className="text-sm text-muted">{f.enumValues?.join(", ")}</span>}
                              {f.type === "reference" && f.reference && (
                                <span className="inline-flex items-center gap-1">
                                  <ArrowRight className="size-3.5 text-muted" aria-hidden />
                                  <TextLink to={buildPath(routes.data.entity, { entityName: f.reference })}>{f.reference}</TextLink>
                                </span>
                              )}
                            </Table.Cell>
                            <Table.Cell className={f.defaultValue !== undefined ? "" : "text-muted"}>
                              {f.defaultValue !== undefined ? String(f.defaultValue) : "—"}
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
              </SectionCard>

              <div className="grid items-start gap-6 md:grid-cols-2">
                <SectionCard title="Relationships">
                  {e.relationships.length === 0 ? (
                    <p className="text-sm text-muted">No relationships.</p>
                  ) : (
                    <ul className="grid gap-2.5">
                      {e.relationships.map((r) => (
                        <li key={r.name} className="flex flex-wrap items-center gap-2 text-sm">
                          <code className="text-xs">{r.name}</code>
                          <Chip size="sm" variant="secondary">
                            {r.kind}
                          </Chip>
                          <ArrowRight className="size-3.5 text-muted" aria-hidden />
                          <TextLink to={buildPath(routes.data.entity, { entityName: r.target })}>{r.target}</TextLink>
                          {r.via && <span className="text-xs text-muted">via {r.via}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionCard>
                <SectionCard title="Events published">
                  {e.events.length === 0 ? (
                    <p className="text-sm text-muted">This entity publishes no events.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {e.events.map((ev) => (
                        <Chip key={ev} size="sm" variant="secondary" className="font-mono">
                          {ev}
                        </Chip>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>
              <AddFieldDialog entity={e} open={adding} onClose={() => setAdding(false)} />
            </div>
          );
        }}
      </QueryState>
    </PageLayout>
  );
}
