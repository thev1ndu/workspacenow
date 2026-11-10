import { ArrowRight, Add, List } from "@carbon/react/icons";
import { useState } from "react";
import { Button, ContainedList, ContainedListItem, InlineNotification, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";

import { useParams } from "react-router-dom";
import { useCan, useGetEntity, useListApplications } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { DetailList, LinkButton, PageLayout, QueryState, SectionCard, StatusChip, TextLink, formatDateTime } from "@workspacenow/views";
import { SCOPE_EXPLANATION } from "./constants";
import { AddFieldDialog } from "./subComponents/AddFieldDialog";
import { SchemaHistoryCard } from "./subComponents/SchemaHistoryCard";
import { ScopeChip } from "./subComponents/ScopeChip";

import common from "./common.module.scss";
import styles from "./EntityDetailPage.module.scss";

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
              <Button kind="secondary" disabled={!canManage} onClick={() => setAdding(true)} renderIcon={Add}>
                Add field
              </Button>
            )}
            <LinkButton variant="primary" href={buildPath(routes.data.records, { entityName: entity.data.name })} renderIcon={List}>
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
            <Stack gap={6}>
              <SchemaHistoryCard entity={e} />
              <div className={styles.twoOne}>
                <SectionCard title="Definition">
                  <DetailList
                    columns={3}
                    items={[
                      { label: "Name", value: <code className={common.code}>{e.name}</code> },
                      { label: "Scope", value: <ScopeChip scope={e.scope} /> },
                      {
                        label: "Owning application",
                        value: owner ? <TextLink to={buildPath(routes.studio.application, { appId: owner.id })}>{owner.name}</TextLink> : "-",
                      },
                      { label: "Read permission", value: <code className={common.code}>{e.readPermission}</code> },
                      { label: "Write permission", value: <code className={common.code}>{e.writePermission}</code> },
                      {
                        label: "Version",
                        value: (
                          <span className={common.row}>
                            <span className={common.numeric}>v{e.version}</span>
                            <StatusChip status={e.lifecycle} />
                          </span>
                        ),
                      },
                      { label: "Updated", value: formatDateTime(e.updatedAt) },
                    ]}
                  />
                </SectionCard>
                <SectionCard title="Ownership">
                  <InlineNotification
                    kind={e.scope === "external" ? "info" : "success"}
                    lowContrast
                    hideCloseButton
                    title={SCOPE_EXPLANATION[e.scope]}
                  />
                </SectionCard>
              </div>

              <SectionCard title="Fields" subtitle={`${e.fields.length} fields`} flush>
                <TableContainer aria-label={`${e.label} fields`}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeader>Field</TableHeader>
                        <TableHeader>Type</TableHeader>
                        <TableHeader>Required</TableHeader>
                        <TableHeader>Unique</TableHeader>
                        <TableHeader>Constraint</TableHeader>
                        <TableHeader>Default</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {e.fields.map((f) => (
                        <TableRow key={f.name} id={f.name}>
                          <TableCell>
                            <p>{f.label}</p>
                            <p className={common.subtle}>{f.name}</p>
                          </TableCell>
                          <TableCell>
                            <Tag size="sm" type="gray">
                              {f.type}
                            </Tag>
                          </TableCell>
                          <TableCell className={f.required ? undefined : common.muted}>{f.required ? "Yes" : "-"}</TableCell>
                          <TableCell className={f.unique ? undefined : common.muted}>{f.unique ? "Yes" : "-"}</TableCell>
                          <TableCell>
                            {f.type === "enum" && <span className={common.muted}>{f.enumValues?.join(", ")}</span>}
                            {f.type === "reference" && f.reference && (
                              <span className={common.row}>
                                <ArrowRight size={16} className={common.arrow} aria-hidden />
                                <TextLink to={buildPath(routes.data.entity, { entityName: f.reference })}>{f.reference}</TextLink>
                              </span>
                            )}
                          </TableCell>
                          <TableCell className={f.defaultValue !== undefined ? undefined : common.muted}>
                            {f.defaultValue !== undefined ? String(f.defaultValue) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </SectionCard>

              <div className={styles.pair}>
                <SectionCard title="Relationships">
                  {e.relationships.length === 0 ? (
                    <p className={common.helper}>No relationships.</p>
                  ) : (
                    <ContainedList label="Relationships" kind="on-page">
                      {e.relationships.map((r) => (
                        <ContainedListItem key={r.name}>
                          <div className={common.row}>
                            <code className={common.code}>{r.name}</code>
                            <Tag size="sm" type="gray">
                              {r.kind}
                            </Tag>
                            <ArrowRight size={16} className={common.arrow} aria-hidden />
                            <TextLink to={buildPath(routes.data.entity, { entityName: r.target })}>{r.target}</TextLink>
                            {r.via && <span className={common.subtle}>via {r.via}</span>}
                          </div>
                        </ContainedListItem>
                      ))}
                    </ContainedList>
                  )}
                </SectionCard>
                <SectionCard title="Events published">
                  {e.events.length === 0 ? (
                    <p className={common.helper}>This entity publishes no events.</p>
                  ) : (
                    <div className={common.tags}>
                      {e.events.map((ev) => (
                        <Tag key={ev} size="sm" type="gray" className={common.code}>
                          {ev}
                        </Tag>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>
              <AddFieldDialog entity={e} open={adding} onClose={() => setAdding(false)} />
            </Stack>
          );
        }}
      </QueryState>
    </PageLayout>
  );
}
