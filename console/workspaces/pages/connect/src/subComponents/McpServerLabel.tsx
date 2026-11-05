import { Globe } from "@workspacenow/icons";
import type { McpServer } from "@workspacenow/types";
import { BrandMark } from "@workspacenow/views";

/** An MCP server as icon and name on one line: the WorkspaceNow mark for the managed server, a globe for external ones. */
export function McpServerLabel({ server }: { server: Pick<McpServer, "name" | "kind"> }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      {server.kind === "managed" ? (
        <BrandMark size="sm" />
      ) : (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-default text-muted ring-1 ring-separator ring-inset" aria-hidden>
          <Globe className="size-3" />
        </span>
      )}
      {server.name}
    </span>
  );
}
