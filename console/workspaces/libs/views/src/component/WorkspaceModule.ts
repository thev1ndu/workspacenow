import type { ReactNode } from "react";
import type { RouteObject } from "react-router-dom";
import type { WorkspaceKey } from "@workspacenow/types";

export interface WorkspaceNavItem {
  label: string;
  href: string;
  /** Unused by the sidebar, which shows icons only for Workspaces. */
  icon?: ReactNode;
  /** Exact match only, for a workspace's own overview link. */
  end?: boolean;
}

/** What each Workspace package contributes to the Shell. */
export interface WorkspaceModule {
  key: WorkspaceKey;
  title: string;
  description: string;
  icon: ReactNode;
  basePath: string;
  navigation: WorkspaceNavItem[];
  routes: RouteObject[];
}
