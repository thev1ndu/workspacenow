import { useEffect, useRef, useState } from "react";
import { Button, Form, Input, Spinner, TextField } from "@heroui/react";
import { ArrowUp, CircleCheck, CircleXmark, SparklesFill, Xmark } from "@workspacenow/icons";
import { useAuthHooks } from "@workspacenow/auth";
import { useRunSidekick, useSession } from "@workspacenow/api-client";
import { buildPath, routes, type AgentRun, type Permission } from "@workspacenow/types";
import { TextLink } from "@workspacenow/views";

const SUGGESTIONS: Array<{ prompt: string; needs?: Permission }> = [
  { prompt: "Which items are low on stock?", needs: "inventory.read" },
  { prompt: "Prepare purchase requests for low-stock items", needs: "procurement.request" },
  { prompt: "Approve the pending purchase request", needs: "procurement.approve" },
  { prompt: "Which suppliers do we use?", needs: "supplier.read" },
  { prompt: "What is the replenishment policy?" },
];

interface Turn {
  id: number;
  prompt: string;
  run?: AgentRun;
  error?: string;
}

const humanize = (tool: string) => tool.charAt(0).toUpperCase() + tool.slice(1).replace(/_/g, " ");

function SidekickReply({ run }: { run: AgentRun }) {
  const calls = run.steps.flatMap((step) => (step.kind === "tool" ? [step.call] : []));
  return (
    <div className="grid gap-2.5">
      {calls.length > 0 && (
        <ul className="grid gap-1 rounded-xl border border-separator px-3 py-2.5">
          {calls.map((call, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              {call.outcome === "allowed" ? (
                <CircleCheck className="mt-px size-3.5 shrink-0 text-success" aria-label="Allowed" />
              ) : (
                <CircleXmark className="mt-px size-3.5 shrink-0 text-danger" aria-label={call.outcome === "denied" ? "Denied" : "Failed"} />
              )}
              <span className="min-w-0">
                <span className="text-foreground">{humanize(call.tool)}</span>
                {call.reason && <span className="block text-muted">{call.reason}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm leading-relaxed text-foreground">{run.answer}</p>
      <span className="text-xs">
        <TextLink to={buildPath(routes.control.trace, { traceId: run.traceId })}>View trace</TextLink>
      </span>
    </div>
  );
}

/**
 * The console's assistant. It works as the signed-in user: the platform gives it only the
 * permissions both it and the user hold, and audits every action on the user's behalf.
 */
export function Sidekick({ onClose }: { onClose: () => void }) {
  const { userInfo } = useAuthHooks();
  const { data: session } = useSession();
  const sidekick = useRunSidekick();
  const [prompt, setPrompt] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const end = useRef<HTMLDivElement>(null);
  const permissions = session?.permissions ?? [];
  const suggestions = SUGGESTIONS.filter((s) => !s.needs || permissions.includes(s.needs));

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
        <SparklesFill className="size-4 text-accent" aria-hidden />
        <h2 className="flex-1 text-sm font-semibold">Sidekick</h2>
        {turns.length > 0 && (
          <Button size="sm" variant="ghost" isDisabled={sidekick.isPending} onPress={() => setTurns([])}>
            New chat
          </Button>
        )}
        <Button isIconOnly size="sm" variant="ghost" aria-label="Close Sidekick" onPress={onClose}>
          <Xmark className="size-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5" aria-live="polite">
        {turns.length === 0 ? (
          <div className="grid gap-4">
            <div>
              <p className="text-base font-semibold">Hi {userInfo?.name.split(" ")[0]}, what can I do for you?</p>
              <p className="mt-1 text-sm text-muted">
                I work as you{session?.roles.length ? ` (${session.roles.join(", ")})` : ""}, so I can only do what you are allowed to.
              </p>
            </div>
            <div className="grid gap-1.5">
              {suggestions.map((s) => (
                <Button
                  key={s.prompt}
                  variant="outline"
                  className="h-auto w-full justify-start py-2 text-left font-normal whitespace-normal"
                  onPress={() => send(s.prompt)}
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
                    <Spinner size="sm" />
                    Working on it
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
        <div ref={end} />
      </div>

      <Form
        className="flex shrink-0 items-center gap-2 border-t border-separator p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(prompt);
        }}
      >
        <TextField className="flex-1" aria-label="Ask Sidekick" value={prompt} onChange={setPrompt}>
          <Input variant="secondary" placeholder="Ask Sidekick to find or do something" />
        </TextField>
        <Button type="submit" isIconOnly aria-label="Send" isDisabled={!prompt.trim() || sidekick.isPending}>
          <ArrowUp className="size-4" />
        </Button>
      </Form>
    </section>
  );
}
