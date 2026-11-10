import { useState } from "react";
import { InlineNotification, Modal } from "@carbon/react";
import { useInvokeApiOperation } from "@workspacenow/api-client";
import { ApiError, buildPath, routes, type Api, type ApiOperation, type OperationResult } from "@workspacenow/types";
import { JsonView, TextInput, TextLink, errorMessage } from "@workspacenow/views";
import { exampleInput } from "./exampleInput";
import { MethodChip } from "./MethodChip";

interface TryItDialogProps {
  api: Api;
  operation: ApiOperation;
  onClose: () => void;
}

/** Calls the operation through the API entry point, as the signed-in user. */
export function TryItDialog({ api, operation, onClose }: TryItDialogProps) {
  const [input, setInput] = useState(() => exampleInput(operation));
  const [parseError, setParseError] = useState<string>();
  const [result, setResult] = useState<OperationResult>();
  const invoke = useInvokeApiOperation();

  const run = () => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(input || "{}");
    } catch {
      setParseError("Input must be valid JSON");
      return;
    }
    setParseError(undefined);
    setResult(undefined);
    invoke.mutate({ operationId: operation.id, input: parsed }, { onSuccess: setResult });
  };

  const error = invoke.error;
  const denied = error instanceof ApiError && error.status === 403;
  const traceId = error instanceof ApiError ? error.body.traceId : result?.traceId;

  return (
    <Modal
      open
      size="lg"
      hasScrollingContent
      modalHeading={
        <span className="flex items-center gap-3">
          <MethodChip method={operation.method} />
          <span className="font-mono text-sm">
            {api.basePath}
            {operation.path}
          </span>
        </span>
      }
      onRequestClose={onClose}
      primaryButtonText="Send request"
      loadingStatus={invoke.isPending ? "active" : "inactive"}
      onRequestSubmit={run}
      secondaryButtonText="Close"
      onSecondarySubmit={onClose}
    >
      <div className="grid gap-4">
        <p className="text-sm text-muted">
          {operation.summary}. Invokes business operation <code className="text-foreground">{operation.businessOperation}</code>, which
          requires <code className="text-foreground">{operation.permission}</code>.
        </p>
        <TextInput label="Request input (JSON)" value={input} onChange={setInput} multiline rows={8} error={parseError} />
        {denied && (
          <InlineNotification kind="error" lowContrast hideCloseButton title="Denied by policy" subtitle={errorMessage(error)} />
        )}
        {!!error && !denied && (
          <InlineNotification kind="error" lowContrast hideCloseButton subtitle={errorMessage(error)} />
        )}
        {result && (
          <div>
            <p className="mb-2 text-sm font-medium">Response</p>
            <JsonView value={result.output} />
          </div>
        )}
        {traceId && (
          <p className="text-sm">
            Trace{" "}
            <TextLink to={buildPath(routes.control.trace, { traceId })} onClick={onClose}>
              {traceId}
            </TextLink>
          </p>
        )}
      </div>
    </Modal>
  );
}
