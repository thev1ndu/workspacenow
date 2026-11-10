import { Add, AiGenerate } from "@carbon/react/icons";
import { useState } from "react";
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@carbon/react";

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
            <Button kind="secondary" onClick={() => setInferOpen(true)} renderIcon={(p) => <AiGenerate className="size-4" aria-hidden {...p} />}>
              New from data
            </Button>
          )}
          <Button kind="primary" onClick={() => setOpen(true)} disabled={!canManage} renderIcon={(p) => <Add className="size-4" aria-hidden {...p} />}>
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
                <Table className="min-w-[860px]">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Name</TableHeader>
                      <TableHeader>Scope</TableHeader>
                      <TableHeader>Owner</TableHeader>
                      <TableHeader className="text-right">Fields</TableHeader>
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
                          <p className="font-mono text-xs text-muted">{e.name}</p>
                        </TableCell>
                        <TableCell>
                          <ScopeChip scope={e.scope} />
                        </TableCell>
                        <TableCell className="text-muted">{appName(e.ownerApplicationId)}</TableCell>
                        <TableCell className="text-right tabular-nums">{e.fields.length}</TableCell>
                        <TableCell className="text-xs text-muted">
                          {e.events.length ? e.events.map((ev) => ev.split(".")[1]).join(", ") : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          <div>{e.readPermission}</div>
                          <div className="text-muted">{e.writePermission}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <span className="tabular-nums">v{e.version}</span>
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
