import { ArrowUp, CheckmarkFilled, ErrorFilled, AiGenerate, Close } from "@carbon/react/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { Button, Loading, TextInput } from "@carbon/react";

import { useAuthHooks } from "@workspacenow/auth";
import { useListApiOperations, useListApis, useRunSidekick, useSession , hasPermission } from "@workspacenow/api-client";
import { buildPath, routes, type AgentRun, type Application, type Permission } from "@workspacenow/types";
import { TextLink } from "@workspacenow/views";

// Each suggestion names the tool it relies on, so an app-scoped Sidekick offers only what that app can do.
const SUGGESTIONS: Array<{ prompt: string; tool: string; needs?: Permission }> = [
  { prompt: "Which items are low on stock?", tool: "get_low_stock_items", needs: "inventory.read" },
  { prompt: "Prepare purchase requests for low-stock items", tool: "create_purchase_request", needs: "procurement.request" },
  { prompt: "Approve the pending purchase request", tool: "approve_purchase_request", needs: "procurement.approve" },
  { prompt: "Which suppliers do we use?", tool: "list_suppliers", needs: "supplier.read" },
  { prompt: "What is the replenishment policy?", tool: "search_policies" },
];

/** The MCP tools an application exposes through its own APIs; the platform confines a scoped Sidekick to these. */
function useApplicationTools(applicationId: string): Set<string> | undefined {
  const apis = useListApis();
  const operations = useListApiOperations();
  if (!apis.data || !operations.data) return undefined;
  const apiIds = new Set(apis.data.items.filter((a) => a.applicationId === applicationId).map((a) => a.id));
  return new Set(operations.data.items.filter((op) => apiIds.has(op.apiId) && op.mcp?.enabled).map((op) => op.mcp!.toolName));
}

interface Turn {
  id: number;
  prompt: string;
  run?: AgentRun;
  error?: string;
}

const humanize = (tool: string) => tool.charAt(0).toUpperCase() + tool.slice(1).replace(/_/g, " ");

/** Renders markdown safely (sanitized) for Sidekick answers. */
function Markdown({ text }: { text: string }) {
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(text, { async: false }) as string), [text]);
  return <div className="prose prose-sm max-w-none text-sm leading-relaxed text-foreground dark:prose-invert [&_code]:rounded [&_code]:bg-default [&_code]:px-1 [&_code]:py-0.5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-default [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5" dangerouslySetInnerHTML={{ __html: html }} />;
}

function SidekickReply({ run }: { run: AgentRun }) {
  const calls = run.steps.flatMap((step) => (step.kind === "tool" ? [step.call] : []));
  return (
    <div className="grid gap-2.5">
      {calls.length > 0 && (
        <ul className="grid gap-1 rounded-xl border border-separator px-3 py-2.5">
          {calls.map((call, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              {call.outcome === "allowed" ? (
                <CheckmarkFilled className="mt-px size-3.5 shrink-0 text-success" aria-label="Allowed" />
              ) : (
                <ErrorFilled className="mt-px size-3.5 shrink-0 text-danger" aria-label={call.outcome === "denied" ? "Denied" : "Failed"} />
              )}
              <span className="min-w-0">
                <span className="text-foreground">{humanize(call.tool)}</span>
                {call.reason && <span className="block text-muted">{call.reason}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Markdown text={run.answer} />
      <span className="text-xs">
        <TextLink to={buildPath(routes.control.trace, { traceId: run.traceId })}>View trace</TextLink>
      </span>
    </div>
  );
}

/**
 * The console's assistant. It works as the signed-in user: the platform gives it only the
 * permissions both it and the user hold, and audits every action on the user's behalf. Inside an
 * app, `scope` confines it to that app: the platform refuses any tool the app does not expose.
 */
export function Sidekick({ onClose, scope }: { onClose: () => void; scope?: { app: Pick<Application, "id" | "name">; tools?: Set<string> } }) {
  const { userInfo } = useAuthHooks();
  const { data: session } = useSession();
  const sidekick = useRunSidekick(scope?.app.id);
  const [prompt, setPrompt] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const end = useRef<HTMLDivElement>(null);
  const permissions = session?.permissions ?? [];
  const suggestions = SUGGESTIONS.filter((s) => (!s.needs || hasPermission(permissions, s.needs)) && (!scope || scope.tools?.has(s.tool)));

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns, sidekick.isPending]);

  const send = (text: string) => {
    const value = text.trim();
    if (!value || sidekick.isPending) return;
    const id = Date.now();
    setTurns((previous) => [...previous, { id, prompt: value }]);
    setPrompt("");
    const settle = (patch: Partial<Turn>) => setTurns((previous) => previous.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    sidekick.mutate(value, {
      onSuccess: (run) => settle({ run }),
      onError: (error) => settle({ error: error instanceof Error ? error.message : "Sidekick could not answer." }),
    });
  };

  return (
    <section aria-label="Sidekick" className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-separator pr-2 pl-4">
        <AiGenerate className="size-4 text-accent" aria-hidden />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
          Sidekick
          {scope && <span className="font-normal text-muted"> / {scope.app.name}</span>}
        </h2>
        {turns.length > 0 && (
          <Button kind="ghost" size="sm" disabled={sidekick.isPending} onClick={() => setTurns([])}>
            New chat
          </Button>
        )}
        <Button kind="ghost" size="sm" hasIconOnly iconDescription="Close Sidekick" onClick={onClose}>
          <Close className="size-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5" aria-live="polite">
        {turns.length === 0 ? (
          <div className="grid gap-4">
            <div>
              <p className="text-base font-semibold">Hi {userInfo?.name.split(" ")[0]}, what can I do for you?</p>
              <p className="mt-1 text-sm text-muted">
                {scope && `I help with ${scope.app.name} only. `}I work as you{session?.roles.length ? ` (${session.roles.join(", ")})` : ""}, so I can
                only do what you are allowed to.
              </p>
            </div>
            <div className="grid gap-1.5">
              {suggestions.map((s) => (
                <Button
                  key={s.prompt}
                  kind="tertiary"
                  className="h-auto w-full justify-start py-2 text-left font-normal whitespace-normal"
                  onClick={() => send(s.prompt)}
                >
                  {s.prompt}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="grid gap-5">
            {turns.map((turn) => (
              <li key={turn.id} className="grid gap-3">
                <p className="max-w-[85%] justify-self-end rounded-2xl rounded-br-md bg-default px-3.5 py-2 text-sm">{turn.prompt}</p>
                {turn.run && <SidekickReply run={turn.run} />}
                {turn.error && <p className="text-sm text-danger">{turn.error}</p>}
                {!turn.run && !turn.error && (
                  <p className="flex items-center gap-2 text-sm text-muted">
                    <Loading small withOverlay={false} description="Working on it" />
                    Working on it
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
        <div ref={end} />
      </div>

      <form
        className="flex shrink-0 items-center gap-2 border-t border-separator p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(prompt);
        }}
      >
        <TextInput
          id="sidekick-prompt"
          className="flex-1"
          labelText="Ask Sidekick"
          hideLabel
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={scope ? `Ask about ${scope.app.name}` : "Ask Sidekick to find or do something"}
        />
        <Button type="submit" kind="primary" hasIconOnly iconDescription="Send" disabled={!prompt.trim() || sidekick.isPending}>
          <ArrowUp className="size-4" />
        </Button>
      </form>
    </section>
  );
}

/** App-scoped Sidekick: the same panel confined to one application's tools. */
export function AppSidekick({ app, onClose }: { app: Pick<Application, "id" | "name">; onClose: () => void }) {
  const tools = useApplicationTools(app.id);
  return <Sidekick onClose={onClose} scope={{ app, tools }} />;
}
