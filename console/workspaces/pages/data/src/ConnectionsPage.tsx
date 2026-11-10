import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { useListConnections } from "@workspacenow/api-client";
import { NoDataFound, PageLayout, QueryState, SectionCard, StatusChip } from "@workspacenow/views";

import styles from "./common.module.scss";

export function ConnectionsPage() {
  const connections = useListConnections();
  return (
    <PageLayout
      title="Connections"
      description="Managed connections hold WorkspaceNow's application data; external ones reach data other systems own."
    >
      <SectionCard flush>
        <QueryState query={connections}>
          {(data) =>
            data.items.length === 0 ? (
              <NoDataFound message="No connections configured." />
            ) : (
              <TableContainer aria-label="Connections">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Name</TableHeader>
                      <TableHeader>Engine</TableHeader>
                      <TableHeader>Host</TableHeader>
                      <TableHeader>Ownership</TableHeader>
                      <TableHeader>Environment</TableHeader>
                      <TableHeader>Status</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.items.map((c) => (
                      <TableRow key={c.id} id={c.id}>
                        <TableCell>{c.name}</TableCell>
                        <TableCell>
                          <Tag size="sm" type="gray">
                            {c.engine}
                          </Tag>
                        </TableCell>
                        <TableCell className={styles.code}>{c.host}</TableCell>
                        <TableCell className={styles.muted}>{c.managed ? "Managed by WorkspaceNow" : "External"}</TableCell>
                        <TableCell className={styles.capitalize}>{c.environment}</TableCell>
                        <TableCell>
                          <StatusChip status={c.status} />
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
    </PageLayout>
  );
}
