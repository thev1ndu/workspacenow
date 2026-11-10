import { ArrowUp, CheckmarkFilled, ErrorFilled, AiGenerate, Close } from "@carbon/react/icons";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { Button, HeaderPanel, InlineLoading, TextInput } from "@carbon/react";

import { useAuthHooks } from "@workspacenow/auth";
import { useListApiOperations, useListApis, useRunSidekick, useSession , hasPermission } from "@workspacenow/api-client";
import { buildPath, routes, type AgentRun, type Application, type Permission } from "@workspacenow/types";
import { TextLink } from "@workspacenow/views";
import styles from "./Sidekick.module.scss";

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
  return <div className={styles.markdown} dangerouslySetInnerHTML={{ __html: html }} />;
}

function SidekickReply({ run }: { run: AgentRun }) {
  const calls = run.steps.flatMap((step) => (step.kind === "tool" ? [step.call] : []));
  return (
    <div className={styles.reply}>
      {calls.length > 0 && (
        <ul className={styles.calls}>
          {calls.map((call, i) => (
            <li key={i} className={styles.call}>
              {call.outcome === "allowed" ? (
                <CheckmarkFilled size={16} className={`${styles.callIcon} ${styles.callAllowed}`} aria-label="Allowed" />
              ) : (
                <ErrorFilled size={16} className={`${styles.callIcon} ${styles.callDenied}`} aria-label={call.outcome === "denied" ? "Denied" : "Failed"} />
              )}
              <span>
                <span className={styles.callTool}>{humanize(call.tool)}</span>
                {call.reason && <span className={styles.callReason}>{call.reason}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Markdown text={run.answer} />
      <span>
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
    <section aria-label="Sidekick" className={styles.root}>
      <header className={styles.header}>
        <AiGenerate size={16} className={styles.headerIcon} aria-hidden />
        <h2 className={styles.title}>
          Sidekick
          {scope && <span className={styles.titleScope}> / {scope.app.name}</span>}
        </h2>
        {turns.length > 0 && (
          <Button kind="ghost" size="sm" disabled={sidekick.isPending} onClick={() => setTurns([])}>
            New chat
          </Button>
        )}
        <Button kind="ghost" size="lg" hasIconOnly renderIcon={Close} iconDescription="Close Sidekick" tooltipPosition="left" onClick={onClose} />
      </header>

      <div className={styles.scroll} aria-live="polite">
        {turns.length === 0 ? (
          <div className={styles.welcome}>
            <div>
              <p className={styles.hello}>Hi {userInfo?.name.split(" ")[0]}, what can I do for you?</p>
              <p className={styles.hint}>
                {scope && `I help with ${scope.app.name} only. `}I work as you{session?.roles.length ? ` (${session.roles.join(", ")})` : ""}, so I can
                only do what you are allowed to.
              </p>
            </div>
            <div className={styles.suggestions}>
              {suggestions.map((s) => (
                <Button key={s.prompt} kind="tertiary" className={styles.suggestion} onClick={() => send(s.prompt)}>
                  {s.prompt}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <ol className={styles.turns}>
            {turns.map((turn) => (
              <li key={turn.id} className={styles.turn}>
                <p className={styles.prompt}>{turn.prompt}</p>
                {turn.run && <SidekickReply run={turn.run} />}
                {turn.error && <p className={styles.error}>{turn.error}</p>}
                {!turn.run && !turn.error && <InlineLoading description="Working on it" />}
              </li>
            ))}
          </ol>
        )}
        <div ref={end} />
      </div>

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          send(prompt);
        }}
      >
        <TextInput
          id="sidekick-prompt"
          className={styles.formInput}
          labelText="Ask Sidekick"
          hideLabel
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={scope ? `Ask about ${scope.app.name}` : "Ask Sidekick to find or do something"}
        />
        <Button type="submit" kind="primary" hasIconOnly renderIcon={ArrowUp} iconDescription="Send" tooltipPosition="left" disabled={!prompt.trim() || sidekick.isPending} />
      </form>
    </section>
  );
}

/** App-scoped Sidekick: the same panel confined to one application's tools. */
export function AppSidekick({ app, onClose }: { app: Pick<Application, "id" | "name">; onClose: () => void }) {
  const tools = useApplicationTools(app.id);
  return <Sidekick onClose={onClose} scope={{ app, tools }} />;
}

/** The dock Sidekick lives in: a Carbon header panel on the right, kept mounted while closed so the conversation survives. */
export function SidekickPanel({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <HeaderPanel aria-label="Sidekick" expanded={open} addFocusListeners={false} className={styles.dock}>
      <div className={styles.dockBody} inert={!open}>
        {children}
      </div>
    </HeaderPanel>
  );
}
