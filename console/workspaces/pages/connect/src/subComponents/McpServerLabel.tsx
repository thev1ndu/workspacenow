import { Globe } from "@carbon/react/icons";

import type { McpServer } from "@workspacenow/types";
import { BrandMark } from "@workspacenow/views";

import common from "../common.module.scss";

/** An MCP server as icon and name on one line: the WorkspaceNow mark for the managed server, a globe for external ones. */
export function McpServerLabel({ server }: { server: Pick<McpServer, "name" | "kind"> }) {
  return (
    <span className={common.inline}>
      {server.kind === "managed" ? <BrandMark size="sm" /> : <Globe size={16} aria-hidden />}
      {server.name}
    </span>
  );
}
