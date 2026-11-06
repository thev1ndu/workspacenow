import { PencilRuler } from "@workspacenow/icons";
import { routes } from "@workspacenow/types";
import type { WorkspaceModule } from "@workspacenow/views";
import { ApplicationDetailPage } from "./ApplicationDetailPage";
import { ApplicationsPage } from "./ApplicationsPage";
import { BuilderPage } from "./BuilderPage";
import { EditApplicationPage } from "./EditApplicationPage";
import { StudioOverviewPage } from "./StudioOverviewPage";

export const studioWorkspace: WorkspaceModule = {
  key: "studio",
  title: "Studio",
  description: "Build, preview and release business applications from shared entities, with AI-assisted design.",
  icon: <PencilRuler className="size-4" />,
  basePath: routes.studio.root,
  navigation: [
    { label: "Overview", href: routes.studio.root, end: true },
    { label: "Applications", href: routes.studio.applications },
    { label: "Application builder", href: routes.studio.builder },
  ],
  routes: [
    { index: true, element: <StudioOverviewPage /> },
    { path: "applications", element: <ApplicationsPage /> },
    { path: "applications/:appId", element: <ApplicationDetailPage /> },
    { path: "applications/:appId/edit", element: <EditApplicationPage /> },
    { path: "builder", element: <BuilderPage /> },
  ],
};
