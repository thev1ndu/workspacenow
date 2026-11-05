import { Button, Modal } from "@heroui/react";
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
    <Modal.Backdrop isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Container size="lg" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading className="font-mono">{tool.name}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="grid gap-4">
            <p className="text-sm text-muted">
              {tool.source === "workspacenow"
                ? "Generated from an API operation. Calling it runs the same business operation, authorization and audit as the REST endpoint."
                : "Discovered on an external MCP server registered in Connect."}
            </p>
            <JsonView value={definition} />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onPress={onClose}>
              Close
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
