import { Security } from "@carbon/react/icons";

import { routes } from "@workspacenow/types";
import type { WorkspaceModule } from "@workspacenow/views";
import { AccessPage } from "./AccessPage";
import { AlertsPage } from "./AlertsPage";
import { AuditPage } from "./AuditPage";
import { ControlOverview } from "./ControlOverview";
import { EnvironmentsPage } from "./EnvironmentsPage";
import { HealthPage } from "./HealthPage";
import { OrganizationPage } from "./OrganizationPage";
import { SettingsPage } from "./SettingsPage";
import { TraceDetailPage } from "./TraceDetailPage";
import { TracesPage } from "./TracesPage";

export const controlWorkspace: WorkspaceModule = {
  key: "control",
  title: "Control",
  description: "Govern identity, access, environments, deployments, audit and health across the installation.",
  icon: <Security className="size-4" />,
  basePath: routes.control.root,
  navigation: [
    { label: "Overview", href: routes.control.root, end: true },
    { label: "Organization", href: routes.control.organization },
    { label: "Identity and access", href: routes.control.access },
    { label: "Environments", href: routes.control.environments },
    { label: "Audit log", href: routes.control.audit },
    { label: "Alerts and SLOs", href: routes.control.alerts },
    { label: "Traces", href: routes.control.traces },
    { label: "Health & errors", href: routes.control.health },
    { label: "Settings", href: routes.control.settings },
  ],
  routes: [
    { index: true, element: <ControlOverview /> },
    { path: "organization", element: <OrganizationPage /> },
    { path: "access", element: <AccessPage /> },
    { path: "environments", element: <EnvironmentsPage /> },
    { path: "audit", element: <AuditPage /> },
    { path: "alerts", element: <AlertsPage /> },
    { path: "traces", element: <TracesPage /> },
    { path: "traces/:traceId", element: <TraceDetailPage /> },
    { path: "health", element: <HealthPage /> },
    { path: "settings", element: <SettingsPage /> },
  ],
};
