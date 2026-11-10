import { Edit } from "@carbon/react/icons";

import { useParams } from "react-router-dom";
import { useCan, useGetApplication } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import { LinkButton, PageLayout, QueryState, StatusChip } from "@workspacenow/views";
import { useDepartmentName } from "../subComponents/useDepartmentName";
import { AppIcon } from "./AppIcon";
import { ApplicationView } from "./ApplicationView";
import { PinButton } from "./PinButton";

/** Runs an application for its users, outside Studio. Every action goes through governed operations. */
export function AppPage() {
  const { appId } = useParams();
  const application = useGetApplication({ appId });
  const canBuild = useCan("studio.manage");
  const departmentName = useDepartmentName();
  const app = application.data;

  return (
    <PageLayout
      title={
        app ? (
          <span className="flex items-center gap-3">
            <AppIcon app={app} size="lg" />
            <span className="min-w-0">
              <span className="block truncate">{app.name}</span>
              <span className="mt-1 flex flex-wrap items-center gap-2 text-sm font-normal tracking-normal text-muted">
                {departmentName(app.ownerDepartmentId)} / v{app.version}
                <StatusChip status={app.lifecycle} />
              </span>
            </span>
          </span>
        ) : (
          "Application"
        )
      }
      documentTitle={app?.name}
      backHref={routes.catalog}
      backLabel="Applications"
      isLoading={application.isLoading}
      actions={
        app && (
          <>
            <PinButton app={app} variant="secondary" />
            {canBuild && (
              <LinkButton size="sm" variant="secondary" href={buildPath(routes.studio.applicationEdit, { appId: app.id })}>
                <Edit className="size-3.5" aria-hidden />
                Edit in Studio
              </LinkButton>
            )}
          </>
        )
      }
    >
      <QueryState query={application}>{(a) => <ApplicationView app={a} />}</QueryState>
    </PageLayout>
  );
}
