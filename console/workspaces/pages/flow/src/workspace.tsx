import { Flow } from "@carbon/react/icons";

import { routes } from "@workspacenow/types";
import type { WorkspaceModule } from "@workspacenow/views";
import { ApprovalsPage } from "./ApprovalsPage";
import { ExecutionDetailPage } from "./ExecutionDetailPage";
import { ExecutionsPage } from "./ExecutionsPage";
import { FlowOverview } from "./FlowOverview";
import { WorkflowDetailPage } from "./WorkflowDetailPage";
import { WorkflowEditorPage } from "./WorkflowEditorPage";
import { WorkflowsPage } from "./WorkflowsPage";

export const flowWorkspace: WorkspaceModule = {
  key: "flow",
  title: "Flow",
  description: "Orchestrate durable workflows, events and human approvals across applications and agents.",
  icon: <Flow size={16} />,
  basePath: routes.flow.root,
  navigation: [
    { label: "Overview", href: routes.flow.root, end: true },
    { label: "Workflows", href: routes.flow.workflows },
    { label: "Executions", href: routes.flow.executions },
    { label: "Approvals", href: routes.flow.approvals },
  ],
  routes: [
    { index: true, element: <FlowOverview /> },
    { path: "workflows", element: <WorkflowsPage /> },
    { path: "workflows/new", element: <WorkflowEditorPage /> },
    { path: "workflows/:workflowId", element: <WorkflowDetailPage /> },
    { path: "workflows/:workflowId/edit", element: <WorkflowEditorPage /> },
    { path: "executions", element: <ExecutionsPage /> },
    { path: "executions/:executionId", element: <ExecutionDetailPage /> },
    { path: "approvals", element: <ApprovalsPage /> },
  ],
};
