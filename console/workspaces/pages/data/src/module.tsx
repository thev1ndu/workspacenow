import { Database } from "@workspacenow/icons";
import { Navigate } from "react-router-dom";
import { buildPath, routes } from "@workspacenow/types";
import type { WorkspaceModule } from "@workspacenow/views";
import { ConnectionsPage } from "./ConnectionsPage";
import { DataModelPage } from "./DataModelPage";
import { DataOverviewPage } from "./DataOverviewPage";
import { EntitiesPage } from "./EntitiesPage";
import { EntityDetailPage } from "./EntityDetailPage";
import { RecordsPage } from "./RecordsPage";

export const dataWorkspace: WorkspaceModule = {
  key: "data",
  title: "Data",
  description: "Define business entities, their relationships and access, and work with their records.",
  icon: <Database className="size-4" />,
  basePath: routes.data.root,
  navigation: [
    { label: "Overview", href: routes.data.root, end: true },
    { label: "Entities", href: routes.data.entities },
    { label: "Records", href: buildPath(routes.data.records, { entityName: "Product" }) },
    { label: "Data model", href: routes.data.model },
    { label: "Connections", href: routes.data.connections },
  ],
  routes: [
    { index: true, element: <DataOverviewPage /> },
    { path: "entities", element: <EntitiesPage /> },
    { path: "entities/:entityName", element: <EntityDetailPage /> },
    { path: "records", element: <Navigate to={buildPath(routes.data.records, { entityName: "Product" })} replace /> },
    { path: "records/:entityName", element: <RecordsPage /> },
    { path: "model", element: <DataModelPage /> },
    { path: "connections", element: <ConnectionsPage /> },
  ],
};
