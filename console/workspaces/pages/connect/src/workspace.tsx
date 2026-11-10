import { Plug } from "@carbon/react/icons";

import { routes } from "@workspacenow/types";
import type { WorkspaceModule } from "@workspacenow/views";
import { ApiDetailPage } from "./ApiDetailPage";
import { ApisPage } from "./ApisPage";
import { ConnectOverview } from "./ConnectOverview";
import { IntegrationsPage } from "./IntegrationsPage";
import { McpPage } from "./McpPage";

export const connectWorkspace: WorkspaceModule = {
  key: "connect",
  title: "Connect",
  description: "Build APIs, integrate external systems and expose business operations as MCP tools.",
  icon: <Plug size={16} />,
  basePath: routes.connect.root,
  navigation: [
    { label: "Overview", href: routes.connect.root, end: true },
    { label: "APIs", href: routes.connect.apis },
    { label: "MCP", href: routes.connect.mcp },
    { label: "Integrations", href: routes.connect.integrations },
  ],
  routes: [
    { index: true, element: <ConnectOverview /> },
    { path: "apis", element: <ApisPage /> },
    { path: "apis/:apiId", element: <ApiDetailPage /> },
    { path: "mcp", element: <McpPage /> },
    { path: "integrations", element: <IntegrationsPage /> },
  ],
};
