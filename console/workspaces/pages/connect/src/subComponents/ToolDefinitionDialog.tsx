import { Modal, Stack } from "@carbon/react";
import type { McpTool } from "@workspacenow/types";
import { JsonView } from "@workspacenow/views";

/** The tool definition the managed MCP server publishes for this tool. */
export function ToolDefinitionDialog({ tool, onClose }: { tool: McpTool; onClose: () => void }) {
  const definition = {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema,
    ...(tool.source === "workspacenow"
      ? {
          "x-workspacenow": {
            apiOperation: tool.operationId,
            businessOperation: tool.businessOperation,
            requiredPermission: tool.permission,
            authentication: "OAuth 2.0 bearer token for a user or service identity",
            executionPolicy: "Tool must be assigned to the calling agent",
            version: tool.version,
          },
        }
      : { "x-workspacenow": { source: "external", server: tool.serverId } }),
  };
  return (
    <Modal
      open
      size="lg"
      hasScrollingContent
      modalLabel="MCP tool"
      modalHeading={tool.name}
      onRequestClose={onClose}
      secondaryButtonText="Close"
      onSecondarySubmit={onClose}
    >
      <Stack gap={5}>
        <p>
          {tool.source === "workspacenow"
            ? "Generated from an API operation. Calling it runs the same business operation, authorization and audit as the REST endpoint."
            : "Discovered on an external MCP server registered in Connect."}
        </p>
        <JsonView value={definition} />
      </Stack>
    </Modal>
  );
}
