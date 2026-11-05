import type { WorkspaceModule } from "@workspacenow/views";
import { studioWorkspace } from "@workspacenow/studio";
import { connectWorkspace } from "@workspacenow/connect";
import { dataWorkspace } from "@workspacenow/data";
import { aiWorkspace } from "@workspacenow/ai";
import { flowWorkspace } from "@workspacenow/flow";
import { controlWorkspace } from "@workspacenow/control";

/** The six Workspaces, in the order the Shell presents them. */
export const workspaces: WorkspaceModule[] = [
  studioWorkspace,
  connectWorkspace,
  dataWorkspace,
  aiWorkspace,
  flowWorkspace,
  controlWorkspace,
];
