import { Bot } from "@carbon/react/icons";

import { routes } from "@workspacenow/types";
import type { WorkspaceModule } from "@workspacenow/views";
import { AgentDetailPage } from "./AgentDetailPage";
import { AgentsPage } from "./AgentsPage";
import { AiOverview } from "./AiOverview";
import { ModelsPage } from "./ModelsPage";
import { RunDetailPage } from "./RunDetailPage";
import { RunsPage } from "./RunsPage";

export const aiWorkspace: WorkspaceModule = {
  key: "ai",
  title: "AI",
  description: "Build, test and govern AI agents that act through MCP tools with their own identities.",
  icon: <Bot size={16} />,
  basePath: routes.ai.root,
  navigation: [
    { label: "Overview", href: routes.ai.root, end: true },
    { label: "Agents", href: routes.ai.agents },
    { label: "Runs", href: routes.ai.runs },
    { label: "Models", href: routes.ai.models },
  ],
  routes: [
    { index: true, element: <AiOverview /> },
    { path: "agents", element: <AgentsPage /> },
    { path: "agents/:agentId", element: <AgentDetailPage /> },
    { path: "runs", element: <RunsPage /> },
    { path: "runs/:runId", element: <RunDetailPage /> },
    { path: "models", element: <ModelsPage /> },
  ],
};
