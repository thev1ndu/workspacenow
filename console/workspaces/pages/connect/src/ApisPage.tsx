import { Table } from "@heroui/react";
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
              <Table variant="secondary">
                <Table.ScrollContainer>
                  <Table.Content aria-label="APIs" className="min-w-[720px]">
                    <Table.Header>
                      <Table.Column isRowHeader>Name</Table.Column>
                      <Table.Column>Base path</Table.Column>
                      <Table.Column>Application</Table.Column>
                      <Table.Column>Version</Table.Column>
                      <Table.Column>Lifecycle</Table.Column>
                      <Table.Column className="text-right">Operations</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {data.items.map((api) => (
                        <Table.Row key={api.id} id={api.id}>
                          <Table.Cell>
                            <TextLink to={buildPath(routes.connect.api, { apiId: api.id })}>{api.name}</TextLink>
                          </Table.Cell>
                          <Table.Cell className="font-mono text-xs">{api.basePath}</Table.Cell>
                          <Table.Cell>{appName(api.applicationId)}</Table.Cell>
                          <Table.Cell className="tabular-nums">{api.version}</Table.Cell>
                          <Table.Cell>
                            <StatusChip status={api.lifecycle} />
                          </Table.Cell>
                          <Table.Cell className="text-right tabular-nums">{opCount(api.id)}</Table.Cell>
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
    </PageLayout>
  );
}
