import { useListApiOperations, useListApis, useListApplications } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { PageLayout, QueryState, SectionCard, StatusChip, TextLink } from "@workspacenow/views";
import { PagedTable } from "./subComponents/ResourceTable";

import common from "./common.module.scss";

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
          {(data) => (
            <PagedTable
              label="APIs"
              items={data.items}
              rowKey={(api) => api.id}
              emptyMessage="No APIs yet. Studio generates one for every application."
              searchPlaceholder="Search APIs"
              searchText={(api) => `${api.name} ${api.basePath} ${appName(api.applicationId)} ${api.version} ${api.lifecycle}`}
              columns={[
                { key: "name", header: "Name", cell: (api) => <TextLink to={buildPath(routes.connect.api, { apiId: api.id })}>{api.name}</TextLink> },
                { key: "basePath", header: "Base path", cell: (api) => <span className={common.mono}>{api.basePath}</span> },
                { key: "application", header: "Application", cell: (api) => appName(api.applicationId) },
                { key: "version", header: "Version", cell: (api) => <span className={common.numeric}>{api.version}</span> },
                { key: "lifecycle", header: "Lifecycle", cell: (api) => <StatusChip status={api.lifecycle} /> },
                { key: "operations", header: "Operations", end: true, cell: (api) => <span className={common.numeric}>{opCount(api.id)}</span> },
              ]}
            />
          )}
        </QueryState>
      </SectionCard>
    </PageLayout>
  );
}
