import { useState } from "react";
import { Button, Card, Modal, Table, Tooltip } from "@heroui/react";
import { Lock, Plus, Rocket } from "@workspacenow/icons";
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
        <Button size="sm" variant="secondary" onPress={() => setOpen(true)}>
          <Plus className="size-3.5" aria-hidden />
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
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content aria-label="Releases" className="min-w-[640px]">
                  <Table.Header>
                    <Table.Column isRowHeader>Version</Table.Column>
                    <Table.Column>Notes</Table.Column>
                    <Table.Column>Created by</Table.Column>
                    <Table.Column>Created</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {data.items.map((r) => (
                      <Table.Row key={r.id} id={r.id}>
                        <Table.Cell className="font-medium tabular-nums">v{r.version}</Table.Cell>
                        <Table.Cell className={r.notes ? "" : "text-muted"}>{r.notes || "—"}</Table.Cell>
                        <Table.Cell>{r.createdBy}</Table.Cell>
                        <Table.Cell className="whitespace-nowrap text-muted">{formatDateTime(r.createdAt)}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          )
        }
      </QueryState>
      <Modal.Backdrop isOpen={open} onOpenChange={setOpen}>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Create release of {app.name}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <TextInput label="Release notes" value={notes} onChange={setNotes} multiline rows={3} placeholder="What changed?" />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                isPending={createRelease.isPending}
                onPress={() =>
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
                Create release
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
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
                <Card key={key} className="flex h-full flex-col gap-0 p-5">
                  <div className="flex items-center gap-2">
                    <h3 className="flex-1 text-sm font-semibold">{env?.name ?? key}</h3>
                    {env?.requiresApproval && (
                      <Tooltip delay={300}>
                        <Tooltip.Trigger aria-label="Promotion requires approval">
                          <Lock className="size-4 text-muted" aria-hidden />
                        </Tooltip.Trigger>
                        <Tooltip.Content>Requires deployment.promote (Release Manager)</Tooltip.Content>
                      </Tooltip>
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
                    fullWidth
                    variant={upToDate ? "secondary" : "primary"}
                    isDisabled={!source || upToDate}
                    isPending={deploy.isPending && deploy.variables?.environment === key}
                    onPress={() => source && deploy.mutate({ applicationId: app.id, environment: key, version: source })}
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
                </Card>
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
              <Table variant="secondary">
                <Table.ScrollContainer>
                  <Table.Content aria-label="Deployment history" className="min-w-[640px]">
                    <Table.Header>
                      <Table.Column isRowHeader>Environment</Table.Column>
                      <Table.Column>Version</Table.Column>
                      <Table.Column>Status</Table.Column>
                      <Table.Column>Deployed by</Table.Column>
                      <Table.Column>When</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {data.items.map((d) => (
                        <Table.Row key={d.id} id={d.id}>
                          <Table.Cell className="capitalize">{d.environment}</Table.Cell>
                          <Table.Cell className="tabular-nums">v{d.version}</Table.Cell>
                          <Table.Cell>
                            <StatusChip status={d.status} />
                          </Table.Cell>
                          <Table.Cell>{d.deployedBy}</Table.Cell>
                          <Table.Cell className="whitespace-nowrap text-muted">{formatDateTime(d.deployedAt)}</Table.Cell>
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
    </div>
  );
}
