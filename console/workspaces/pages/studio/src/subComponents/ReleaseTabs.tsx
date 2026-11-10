import { Locked, Add, Rocket } from "@carbon/react/icons";
import { useState } from "react";
import { Button, Modal, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tile } from "@carbon/react";

import { useCreateDeployment, useCreateRelease, useListDeployments, useListEnvironments, useListReleases } from "@workspacenow/api-client";
import type { Application, EnvironmentKey } from "@workspacenow/types";
import { NoDataFound, QueryState, SectionCard, StatusChip, TextInput, formatDateTime, formatRelative, CardGridSkeleton } from "@workspacenow/views";
import shared from "../shared.module.scss";

import styles from "./ReleaseTabs.module.scss";

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
        <Button size="sm" kind="secondary" renderIcon={Add} onClick={() => setOpen(true)}>
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
              <Table>
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
                      <TableCell className={shared.numeric}>v{r.version}</TableCell>
                      <TableCell>{r.notes || "-"}</TableCell>
                      <TableCell>{r.createdBy}</TableCell>
                      <TableCell className={shared.nowrap}>{formatDateTime(r.createdAt)}</TableCell>
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
    <Stack gap={6}>
      <QueryState query={environments} skeleton={<CardGridSkeleton count={3} columns={3} />}>
        {(envs) => (
          <div className={styles.envGrid}>
            {ORDER.map((key, i) => {
              const env = envs.items.find((e) => e.key === key);
              const current = active(key);
              const source = i === 0 ? latest?.version : active(ORDER[i - 1])?.version;
              const upToDate = !!current && current.version === source;
              return (
                <Tile key={key} className={styles.env}>
                  <div className={styles.envHead}>
                    <h3 className={styles.envName}>{env?.name ?? key}</h3>
                    {env?.requiresApproval && (
                      <span title="Requires deployment.promote (Release Manager)">
                        <Locked size={16} className={styles.lock} aria-label="Promotion requires approval" />
                      </span>
                    )}
                  </div>
                  <p className={styles.envDescription}>{env?.description}</p>
                  <div className={styles.running}>
                    <p className={styles.runningLabel}>Running</p>
                    <p className={styles.version}>{current ? `v${current.version}` : "-"}</p>
                    {current && (
                      <p className={styles.by}>
                        by {current.deployedBy}, {formatRelative(current.deployedAt)}
                      </p>
                    )}
                  </div>
                  <Button
                    className={styles.deploy}
                    renderIcon={Rocket}
                    kind={upToDate ? "secondary" : "primary"}
                    disabled={!source || upToDate || (deploy.isPending && deploy.variables?.environment === key)}
                    onClick={() => source && deploy.mutate({ applicationId: app.id, environment: key, version: source })}
                  >
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
                </Tile>
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
                <Table>
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
                        <TableCell className={styles.capitalize}>{d.environment}</TableCell>
                        <TableCell className={shared.numeric}>v{d.version}</TableCell>
                        <TableCell>
                          <StatusChip status={d.status} />
                        </TableCell>
                        <TableCell>{d.deployedBy}</TableCell>
                        <TableCell className={shared.nowrap}>{formatDateTime(d.deployedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          }
        </QueryState>
      </SectionCard>
    </Stack>
  );
}
