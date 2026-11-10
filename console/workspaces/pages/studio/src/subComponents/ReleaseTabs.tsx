import { Locked, Add, Rocket } from "@carbon/react/icons";
import { useState } from "react";
import { Button, Modal, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@carbon/react";

import { useCreateDeployment, useCreateRelease, useListDeployments, useListEnvironments, useListReleases } from "@workspacenow/api-client";
import type { Application, EnvironmentKey } from "@workspacenow/types";
import { NoDataFound, QueryState, SectionCard, StatusChip, TextInput, formatDateTime, formatRelative, CardGridSkeleton } from "@workspacenow/views";

export function ReleasesTab({ app }: { app: Application }) {
  const releases = useListReleases({ appId: app.id });
  const createRelease = useCreateRelease();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");

  return (
    <SectionCard
      title="Releases"
      subtitle="Releases are immutable snapshots of the blueprint."
      actions={
        <Button size="sm" kind="secondary" onClick={() => setOpen(true)}>
          <Add className="size-3.5" aria-hidden />
          Create release
        </Button>
      }
      flush
    >
      <QueryState query={releases}>
        {(data) =>
          data.items.length === 0 ? (
            <NoDataFound message="No releases yet. Create one to deploy this application." />
          ) : (
            <TableContainer aria-label="Releases">
              <Table className="min-w-[640px]">
                <TableHead>
                  <TableRow>
                    <TableHeader scope="col">Version</TableHeader>
                    <TableHeader scope="col">Notes</TableHeader>
                    <TableHeader scope="col">Created by</TableHeader>
                    <TableHeader scope="col">Created</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((r) => (
                    <TableRow key={r.id} id={r.id}>
                      <TableCell className="font-medium tabular-nums">v{r.version}</TableCell>
                      <TableCell className={r.notes ? "" : "text-muted"}>{r.notes || "—"}</TableCell>
                      <TableCell>{r.createdBy}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted">{formatDateTime(r.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )
        }
      </QueryState>
      <Modal
        open={open}
        size="md"
        modalHeading={`Create release of ${app.name}`}
        onRequestClose={() => setOpen(false)}
        secondaryButtonText="Cancel"
        onSecondarySubmit={() => setOpen(false)}
        primaryButtonText="Create release"
        primaryButtonDisabled={createRelease.isPending}
        loadingStatus={createRelease.isPending ? "active" : "inactive"}
        loadingDescription="Creating"
        onRequestSubmit={() =>
          createRelease.mutate(
            { appId: app.id, notes },
            {
              onSuccess: () => {
                setNotes("");
                setOpen(false);
              },
            },
          )
        }
      >
        <TextInput label="Release notes" value={notes} onChange={setNotes} multiline rows={3} placeholder="What changed?" />
      </Modal>
    </SectionCard>
  );
}

const ORDER: EnvironmentKey[] = ["development", "staging", "production"];

export function DeploymentsTab({ app }: { app: Application }) {
  const environments = useListEnvironments();
  const deployments = useListDeployments({ applicationId: app.id });
  const releases = useListReleases({ appId: app.id });
  const deploy = useCreateDeployment();
  const latest = releases.data?.items[0];
  const active = (env: EnvironmentKey) => deployments.data?.items.find((d) => d.environment === env && d.status === "active");

  return (
    <div className="grid gap-6">
      <QueryState query={environments} skeleton={<CardGridSkeleton count={3} className="md:grid-cols-3" />}>
        {(envs) => (
          <div className="grid gap-4 md:grid-cols-3">
            {ORDER.map((key, i) => {
              const env = envs.items.find((e) => e.key === key);
              const current = active(key);
              const source = i === 0 ? latest?.version : active(ORDER[i - 1])?.version;
              const upToDate = !!current && current.version === source;
              return (
                <div key={key} className="flex h-full flex-col gap-0 rounded-xl border border-separator bg-surface p-5">
                  <div className="flex items-center gap-2">
                    <h3 className="flex-1 text-sm font-semibold">{env?.name ?? key}</h3>
                    {env?.requiresApproval && (
                      <span title="Requires deployment.promote (Release Manager)">
                        <Locked className="size-4 text-muted" aria-label="Promotion requires approval" />
                      </span>
                    )}
                  </div>
                  {/* flex-1 absorbs uneven description heights so Running and the action line up across the row. */}
                  <p className="mt-1 flex-1 text-sm text-muted">{env?.description}</p>
                  <div className="mt-4 mb-4">
                    <p className="text-xs text-muted">Running</p>
                    <p className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">{current ? `v${current.version}` : "—"}</p>
                    {current && (
                      <p className="mt-0.5 text-xs text-muted">
                        by {current.deployedBy}, {formatRelative(current.deployedAt)}
                      </p>
                    )}
                  </div>
                  <Button
                    className="w-full"
                    kind={upToDate ? "secondary" : "primary"}
                    disabled={!source || upToDate || (deploy.isPending && deploy.variables?.environment === key)}
                    onClick={() => source && deploy.mutate({ applicationId: app.id, environment: key, version: source })}
                  >
                    <Rocket className="size-4" aria-hidden />
                    {!source
                      ? i === 0
                        ? "Create a release first"
                        : `Nothing in ${ORDER[i - 1]}`
                      : upToDate
                        ? "Up to date"
                        : i === 0
                          ? `Deploy v${source}`
                          : `Promote v${source}`}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </QueryState>
      <SectionCard title="Deployment history" flush>
        <QueryState query={deployments}>
          {(data) =>
            data.items.length === 0 ? (
              <NoDataFound message="Never deployed." />
            ) : (
              <TableContainer aria-label="Deployment history">
                <Table className="min-w-[640px]">
                  <TableHead>
                    <TableRow>
                      <TableHeader scope="col">Environment</TableHeader>
                      <TableHeader scope="col">Version</TableHeader>
                      <TableHeader scope="col">Status</TableHeader>
                      <TableHeader scope="col">Deployed by</TableHeader>
                      <TableHeader scope="col">When</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.items.map((d) => (
                      <TableRow key={d.id} id={d.id}>
                        <TableCell className="capitalize">{d.environment}</TableCell>
                        <TableCell className="tabular-nums">v{d.version}</TableCell>
                        <TableCell>
                          <StatusChip status={d.status} />
                        </TableCell>
                        <TableCell>{d.deployedBy}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted">{formatDateTime(d.deployedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          }
        </QueryState>
      </SectionCard>
    </div>
  );
}
