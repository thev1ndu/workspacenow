import { Edit } from "@carbon/react/icons";

import { routes } from "@workspacenow/types";
import type { WorkspaceModule } from "@workspacenow/views";
import { ApplicationDetailPage } from "./ApplicationDetailPage";
import { ApplicationsPage } from "./ApplicationsPage";
import { BuilderPage } from "./BuilderPage";
import { EditApplicationPage } from "./EditApplicationPage";
import { StudioOverviewPage } from "./StudioOverviewPage";
import { TemplatesPage } from "./TemplatesPage";

export const studioWorkspace: WorkspaceModule = {
  key: "studio",
  title: "Studio",
  description: "Build, preview and release business applications from shared entities, with AI-assisted design.",
  icon: <Edit className="size-4" />,
  basePath: routes.studio.root,
  navigation: [
    { label: "Overview", href: routes.studio.root, end: true },
    { label: "Applications", href: routes.studio.applications },
    { label: "Builder", href: routes.studio.builder },
    { label: "Templates", href: routes.studio.templates },
  ],
  routes: [
    { index: true, element: <StudioOverviewPage /> },
    { path: "applications", element: <ApplicationsPage /> },
    { path: "applications/:appId", element: <ApplicationDetailPage /> },
    { path: "applications/:appId/edit", element: <EditApplicationPage /> },
    { path: "builder", element: <BuilderPage /> },
    { path: "templates", element: <TemplatesPage /> },
  ],
};
