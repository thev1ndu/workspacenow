import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@carbon/react";
import { useListApiOperations, useListApis, useListApplications } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { NoDataFound, PageLayout, QueryState, SectionCard, StatusChip, TextLink } from "@workspacenow/views";

export function ApisPage() {
  const apis = useListApis();
  const operations = useListApiOperations();
  const applications = useListApplications();

  const appName = (id: string) => applications.data?.items.find((a) => a.id === id)?.name ?? id;
  const opCount = (id: string) => operations.data?.items.filter((o) => o.apiId === id).length ?? 0;

  return (
    <PageLayout title="APIs" description="Versioned REST APIs. Each operation maps to one governed business operation.">
      <SectionCard flush>
        <QueryState query={apis}>
          {(data) =>
            data.items.length === 0 ? (
              <NoDataFound message="No APIs yet. Studio generates one for every application." />
            ) : (
              <TableContainer>
                <Table aria-label="APIs" className="min-w-[720px]">
                  <TableHead>
                    <TableRow>
                      <TableHeader scope="col">Name</TableHeader>
                      <TableHeader scope="col">Base path</TableHeader>
                      <TableHeader scope="col">Application</TableHeader>
                      <TableHeader scope="col">Version</TableHeader>
                      <TableHeader scope="col">Lifecycle</TableHeader>
                      <TableHeader scope="col" className="text-right">
                        Operations
                      </TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.items.map((api) => (
                      <TableRow key={api.id} id={api.id}>
                        <TableCell>
                          <TextLink to={buildPath(routes.connect.api, { apiId: api.id })}>{api.name}</TextLink>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{api.basePath}</TableCell>
                        <TableCell>{appName(api.applicationId)}</TableCell>
                        <TableCell className="tabular-nums">{api.version}</TableCell>
                        <TableCell>
                          <StatusChip status={api.lifecycle} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{opCount(api.id)}</TableCell>
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
