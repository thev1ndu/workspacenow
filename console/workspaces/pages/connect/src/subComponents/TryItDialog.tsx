import { useState } from "react";
import { InlineLoading, InlineNotification, Modal, Stack } from "@carbon/react";
import { useInvokeApiOperation } from "@workspacenow/api-client";
import { ApiError, buildPath, routes, type Api, type ApiOperation, type OperationResult } from "@workspacenow/types";
import { JsonView, TextInput, TextLink, errorMessage } from "@workspacenow/views";
import { exampleInput } from "./exampleInput";
import { MethodChip } from "./MethodChip";

import common from "../common.module.scss";

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
        <span className={common.inline}>
          <MethodChip method={operation.method} />
          <span className={common.mono}>
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
      <Stack gap={5}>
        <p>
          {operation.summary}. Invokes business operation <code className={common.mono}>{operation.businessOperation}</code>, which requires{" "}
          <code className={common.mono}>{operation.permission}</code>.
        </p>
        <TextInput label="Request input (JSON)" value={input} onChange={setInput} multiline rows={8} error={parseError} />
        {invoke.isPending && <InlineLoading description="Sending request" />}
        {denied && (
          <InlineNotification className={common.notice} kind="error" lowContrast hideCloseButton title="Denied by policy" subtitle={errorMessage(error)} />
        )}
        {!!error && !denied && <InlineNotification className={common.notice} kind="error" lowContrast hideCloseButton subtitle={errorMessage(error)} />}
        {result && (
          <Stack gap={3}>
            <span className={common.label}>Response</span>
            <JsonView value={result.output} />
          </Stack>
        )}
        {traceId && (
          <p>
            Trace{" "}
            <TextLink to={buildPath(routes.control.trace, { traceId })} onClick={onClose}>
              {traceId}
            </TextLink>
          </p>
        )}
      </Stack>
    </Modal>
  );
}
