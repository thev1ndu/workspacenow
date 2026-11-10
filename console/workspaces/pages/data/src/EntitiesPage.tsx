import { Add, AiGenerate } from "@carbon/react/icons";
import { useState } from "react";
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@carbon/react";

import { useCan, useListApplications, useListEntities } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { NoDataFound, PageLayout, QueryState, SectionCard, StatusChip, TextLink } from "@workspacenow/views";
import { NewEntityDialog } from "./subComponents/NewEntityDialog";
import { InferEntityDialog } from "./subComponents/InferEntityDialog";
import { ScopeChip } from "./subComponents/ScopeChip";

import styles from "./common.module.scss";

export function EntitiesPage() {
  const entities = useListEntities();
  const { data: apps } = useListApplications();
  const canManage = useCan("data.manage");
  const [open, setOpen] = useState(false);
  const [inferOpen, setInferOpen] = useState(false);
  const appName = (id?: string) => apps?.items.find((a) => a.id === id)?.name ?? "-";

  return (
    <PageLayout
      title="Entities"
      description="Each entity is a business-level contract. The Entity Runtime decides how it is stored."
      actions={
        <>
          {canManage && (
            <Button kind="secondary" onClick={() => setInferOpen(true)} renderIcon={AiGenerate}>
              New from data
            </Button>
          )}
          <Button kind="primary" onClick={() => setOpen(true)} disabled={!canManage} renderIcon={Add}>
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
              <TableContainer aria-label="Entities">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Name</TableHeader>
                      <TableHeader>Scope</TableHeader>
                      <TableHeader>Owner</TableHeader>
                      <TableHeader className={styles.numeric}>Fields</TableHeader>
                      <TableHeader>Events</TableHeader>
                      <TableHeader>Read / write</TableHeader>
                      <TableHeader>Version</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.items.map((e) => (
                      <TableRow key={e.id} id={e.id}>
                        <TableCell>
                          <TextLink to={buildPath(routes.data.entity, { entityName: e.name })}>{e.label}</TextLink>
                          <p className={styles.subtle}>{e.name}</p>
                        </TableCell>
                        <TableCell>
                          <ScopeChip scope={e.scope} />
                        </TableCell>
                        <TableCell className={styles.muted}>{appName(e.ownerApplicationId)}</TableCell>
                        <TableCell className={styles.numeric}>{e.fields.length}</TableCell>
                        <TableCell className={styles.muted}>
                          {e.events.length ? e.events.map((ev) => ev.split(".")[1]).join(", ") : "-"}
                        </TableCell>
                        <TableCell>
                          <p className={styles.code}>{e.readPermission}</p>
                          <p className={styles.subtle}>{e.writePermission}</p>
                        </TableCell>
                        <TableCell>
                          <div className={`${styles.row} ${styles.nowrap}`}>
                            <span className={styles.numeric}>v{e.version}</span>
                            <StatusChip status={e.lifecycle} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          }
        </QueryState>
      </SectionCard>
      <NewEntityDialog open={open} onClose={() => setOpen(false)} />
      {inferOpen && <InferEntityDialog onClose={() => setInferOpen(false)} />}
    </PageLayout>
  );
}
