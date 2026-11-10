import { useMemo, useState, type DragEvent } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { Background, Controls, Panel, ReactFlow, ReactFlowProvider, useReactFlow, type Connection, type EdgeChange, type NodeChange } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./flow.css";
import { Check, Layers, Xmark } from "@workspacenow/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useCan, useGetWorkflow, useListAgents, useListBusinessOperations, useListEntities, useListRoles, useSaveWorkflow } from "@workspacenow/api-client";
import { buildPath, routes, validateWorkflow, type WorkflowDefinition, type WorkflowStepKind } from "@workspacenow/types";
import { PageLayout, QueryState, TextInput, errorMessage } from "@workspacenow/views";
import { STEP_KINDS, nodeTypes } from "./subComponents/FlowNodes";
import { useCanvasColorMode } from "./subComponents/WorkflowGraph";
import { StepInspector, TriggerInspector, type InspectorOptions } from "./subComponents/StepInspector";
import { TRIGGER_ID, connect, disconnect, explicit, moveNode, newStep, removeStep, tidy, toGraph, type LinkPath } from "./subComponents/graphModel";

const DRAG_TYPE = "application/x-workflow-step";

const BLANK: WorkflowDefinition = { name: "", description: "", trigger: { kind: "manual" }, steps: [], start: null };

function Notice({ status, children }: { status?: "danger"; children: string }) {
  return <InlineNotification kind={status === "danger" ? "error" : "info"} lowContrast hideCloseButton subtitle={children} />;
}

/** The editor proper; lives inside a ReactFlowProvider so it can place new steps where they are dropped. */
function Editor({ initial, workflowId, options, refs }: { initial: WorkflowDefinition; workflowId?: string; options: InspectorOptions; refs: Parameters<typeof validateWorkflow>[1] }) {
  const navigate = useNavigate();
  const canEdit = useCan("flow.manage");
  const save = useSaveWorkflow();
  const flow = useReactFlow();
  const colorMode = useCanvasColorMode();
  const [definition, setDefinition] = useState(() => explicit(initial));
  const [selected, setSelected] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false);

  const graph = useMemo(() => toGraph(definition), [definition]);
  const nodes = graph.nodes.map((n) => ({ ...n, selected: n.id === selected }));
  const edges = graph.edges.map((e) => ({ ...e, deletable: true }));
  const problems = validateWorkflow(definition, refs);
  const dirty = JSON.stringify(definition) !== JSON.stringify(explicit(initial));
  const step = definition.steps.find((s) => s.id === selected);

  const onNodesChange = (changes: NodeChange[]) => {
    setDefinition((d) =>
      changes.reduce((acc, change) => {
        if (change.type === "position" && change.position) return moveNode(acc, change.id, change.position);
        if (change.type === "remove" && change.id !== TRIGGER_ID) return removeStep(acc, change.id);
        return acc;
      }, d),
    );
    for (const change of changes) {
      if (change.type === "select") setSelected((current) => (change.selected ? change.id : current === change.id ? null : current));
      if (change.type === "remove" && change.id === selected) setSelected(null);
    }
  };
  const onEdgesChange = (changes: EdgeChange[]) =>
    setDefinition((d) => changes.reduce((acc, change) => (change.type === "remove" ? disconnect(acc, change.id) : acc), d));
  const onConnect = (c: Connection) => c.target && setDefinition((d) => connect(d, c.source, (c.sourceHandle ?? "next") as LinkPath, c.target));

  /**
   * Adds a step. Dropped steps land where they are dropped. Clicked ones go below the selected node and
   * are connected to it (a condition's "yes" branch first, then "no"), or below the lowest node.
   */
  const add = (kind: WorkflowStepKind, at?: { x: number; y: number }) => {
    const anchor = selected ? graph.nodes.find((n) => n.id === selected) : undefined;
    const lowest = graph.nodes.reduce<(typeof graph.nodes)[number] | undefined>((low, n) => (!low || n.position.y > low.position.y ? n : low), undefined);
    const from = anchor ?? lowest;
    const anchorStep = anchor && definition.steps.find((s) => s.id === anchor.id);
    // Which handle of the anchor the new step hangs off, if it is free.
    const path: LinkPath | undefined = !anchor
      ? undefined
      : anchor.id === TRIGGER_ID
        ? definition.start ? undefined : "next"
        : anchorStep?.kind === "condition"
          ? !anchorStep.then ? "then" : !anchorStep.otherwise ? "otherwise" : undefined
          : anchorStep && !anchorStep.next ? "next" : undefined;
    let position = at ?? (from ? { x: from.position.x + (path === "then" ? -150 : path === "otherwise" ? 150 : 0), y: from.position.y + 150 } : { x: 0, y: 150 });
    while (!at && graph.nodes.some((n) => Math.abs(n.position.x - position.x) < 200 && Math.abs(n.position.y - position.y) < 80)) position = { ...position, x: position.x + 260 };

    const created = newStep(definition, kind, position);
    setDefinition((d) => {
      const withStep = { ...d, steps: [...d.steps, created], start: d.start ?? created.id };
      return path && anchor ? connect(withStep, anchor.id, path, created.id) : withStep;
    });
    setSelected(created.id);
    // A clicked step can land outside the view; bring the whole flow back into frame. Drops are already in view.
    if (!at) requestAnimationFrame(() => flow.fitView({ padding: 0.25, maxZoom: 1, duration: 250 }));
  };
  const onDrop = (ev: DragEvent) => {
    setDropping(false);
    const kind = ev.dataTransfer.getData(DRAG_TYPE) as WorkflowStepKind;
    if (!kind) return;
    ev.preventDefault();
    add(kind, flow.screenToFlowPosition({ x: ev.clientX - 120, y: ev.clientY - 30 }));
  };

  const detail = workflowId ? buildPath(routes.flow.workflow, { workflowId }) : routes.flow.workflows;

  return (
    <div className="grid gap-4">
      {!canEdit && <Notice>Designing workflows needs flow.manage. Switch to Sahan Gunawardena (Application Developer) or Amaya Perera.</Notice>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-md">
          <TextInput label="Workflow name" required value={definition.name} onChange={(name) => setDefinition((d) => ({ ...d, name }))} placeholder="Low-stock replenishment" />
        </div>
        <div className="flex gap-2">
          <Button kind="tertiary" onClick={() => navigate(detail)}>
            <Xmark className="size-4" aria-hidden />
            {dirty ? "Discard" : "Close"}
          </Button>
          <Button
            disabled={!dirty || problems.length > 0 || !canEdit || save.isPending}
            onClick={() => save.mutate({ workflowId, definition }, { onSuccess: (saved) => navigate(buildPath(routes.flow.workflow, { workflowId: saved.id })) })}
          >
            <Check className="size-4" aria-hidden />
            {workflowId ? "Save new version" : "Create workflow"}
          </Button>
        </div>
      </div>
      {!!save.error && <Notice status="danger">{errorMessage(save.error)}</Notice>}

      <div className="grid gap-4 lg:h-[calc(100dvh-19.5rem)] lg:min-h-[420px] lg:grid-cols-[220px_minmax(0,1fr)_320px]">
        <aside aria-label="Steps" className="flex min-h-0 flex-col gap-1 overflow-y-auto rounded-xl border border-separator bg-surface p-2">
          <p className="px-2 pt-1 pb-1.5 text-xs text-muted">Drag onto the canvas, or click to add below the selected step</p>
          {STEP_KINDS.map(({ kind, label, hint, icon: Icon }) => (
            <button
              key={kind}
              type="button"
              draggable
              title={hint}
              onDragStart={(ev) => {
                ev.dataTransfer.setData(DRAG_TYPE, kind);
                ev.dataTransfer.effectAllowed = "copy";
                // Drag a small chip rather than a ghost of the whole row.
                const chip = ev.currentTarget.querySelector<HTMLElement>("[data-chip]");
                if (chip) ev.dataTransfer.setDragImage(chip, 14, 14);
              }}
              onClick={() => add(kind)}
              className="group flex cursor-grab items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-focus active:cursor-grabbing"
            >
              <span data-chip className="grid size-7 shrink-0 place-items-center rounded-md border border-separator bg-surface text-muted transition-colors group-hover:border-accent group-hover:text-accent">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{label}</span>
                <span className="block truncate text-xs text-muted">{hint}</span>
              </span>
            </button>
          ))}
        </aside>

        <div
          className={`workflow-canvas relative h-[560px] overflow-hidden rounded-xl border bg-surface-secondary/40 transition-colors lg:h-auto ${dropping ? "border-accent ring-2 ring-accent/25" : "border-separator"}`}
          onDragOver={(ev) => {
            if (!ev.dataTransfer.types.includes(DRAG_TYPE)) return;
            ev.preventDefault();
            ev.dataTransfer.dropEffect = "copy";
            setDropping(true);
          }}
          onDragLeave={(ev) => !ev.currentTarget.contains(ev.relatedTarget as Node | null) && setDropping(false)}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            colorMode={colorMode}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onPaneClick={() => setSelected(null)}
            deleteKeyCode={["Backspace", "Delete"]}
            fitView
            fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} />
            <Controls showInteractive={false} position="bottom-right" />
            <Panel position="top-right">
              <Button
                size="sm"
                kind="secondary"
                disabled={definition.steps.length === 0}
                onClick={() => {
                  setDefinition((d) => tidy(d));
                  // Fit once React Flow has the new positions.
                  requestAnimationFrame(() => flow.fitView({ padding: 0.25, maxZoom: 1, duration: 300 }));
                }}
              >
                <Layers className="size-4" aria-hidden />
                Tidy up
              </Button>
            </Panel>
            {definition.steps.length === 0 && (
              <Panel position="bottom-center" className="!mb-8 rounded-xl border border-dashed border-separator bg-surface px-4 py-3 text-center text-sm text-muted">
                Drag a step here, or click one on the left. It connects to the trigger automatically.
              </Panel>
            )}
          </ReactFlow>
        </div>

        <aside aria-label="Settings" className="flex min-h-0 flex-col gap-4 overflow-y-auto rounded-xl border border-separator bg-surface p-4">
          {step ? (
            <StepInspector
              key={step.id}
              step={step}
              options={options}
              onChange={(next) => setDefinition((d) => ({ ...d, steps: d.steps.map((s) => (s.id === next.id ? next : s)) }))}
              onDelete={() => {
                setDefinition((d) => removeStep(d, step.id));
                setSelected(null);
              }}
            />
          ) : selected === TRIGGER_ID ? (
            <TriggerInspector trigger={definition.trigger} events={options.events} onChange={(trigger) => setDefinition((d) => ({ ...d, trigger }))} />
          ) : (
            <>
              <p className="text-xs font-medium text-muted">Workflow</p>
              <TextInput label="Description" multiline rows={3} value={definition.description} onChange={(description) => setDefinition((d) => ({ ...d, description }))} />
              <p className="text-xs text-muted">Select the trigger or a step to configure it. Connect a node's bottom handle to the next step; select an arrow and press Delete to remove it.</p>
            </>
          )}
          {problems.length > 0 && (
            <div className="grid gap-1.5 border-t border-separator pt-4">
              <p className="text-xs font-medium text-muted">Before saving</p>
              <ul className="grid gap-1 text-xs text-warning-soft-foreground">
                {problems.slice(0, 8).map((p) => (
                  <li key={p}>{p}</li>
                ))}
                {problems.length > 8 && <li>and {problems.length - 8} more</li>}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/** Design a workflow on a canvas: new at /flow/workflows/new, or a new version of an existing one. */
export function WorkflowEditorPage() {
  const { workflowId } = useParams();
  const workflow = useGetWorkflow({ workflowId });
  const agents = useListAgents();
  const operations = useListBusinessOperations();
  const roles = useListRoles();
  const entities = useListEntities();

  const options: InspectorOptions = {
    agents: (agents.data?.items ?? []).map((a) => ({ value: a.id, label: a.name })),
    operations: (operations.data?.items ?? []).map((o) => ({ value: o.name, label: o.name })),
    permissions: [...new Set((roles.data?.items ?? []).flatMap((r) => r.permissions))].sort().map((p) => ({ value: p, label: p })),
    events: [...new Set((entities.data?.items ?? []).flatMap((e) => e.events))].sort().map((e) => ({ value: e, label: e })),
  };
  const refs = { agentIds: options.agents.map((a) => a.value), businessOperations: options.operations.map((o) => o.value), permissions: options.permissions.map((p) => p.value) };
  // A list that fails to load (e.g. roles forbidden to a designer) must not hold the editor in a skeleton forever.
  const lists = { agents, "business operations": operations, roles, entities };
  const ready = Object.values(lists).every((q) => q.data !== undefined || q.isError);
  const failed = Object.entries(lists).filter(([, q]) => q.isError).map(([name]) => name);

  return (
    <PageLayout
      title={workflowId ? `Edit ${workflow.data?.name ?? "workflow"}` : "New workflow"}
      description="Drag steps onto the canvas, connect them, and configure each one. Conditions branch the flow; nothing changes until you save."
      backHref={workflowId ? buildPath(routes.flow.workflow, { workflowId }) : routes.flow.workflows}
      backLabel={workflowId ? (workflow.data?.name ?? "Workflow") : "Workflows"}
      isLoading={workflow.isLoading || !ready}
    >
      {ready && failed.length > 0 && (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          className="mb-4"
          title="Some choices could not be loaded"
          subtitle={`Couldn't load ${failed.join(", ")}, so those pickers are empty. Steps that need them will show as problems.`}
        />
      )}
      {ready &&
        (workflowId ? (
          <QueryState query={workflow}>
            {(wf) => (
              <ReactFlowProvider>
                <Editor key={wf.id} workflowId={wf.id} options={options} refs={refs} initial={wf} />
              </ReactFlowProvider>
            )}
          </QueryState>
        ) : (
          <ReactFlowProvider>
            <Editor initial={BLANK} options={options} refs={refs} />
          </ReactFlowProvider>
        ))}
    </PageLayout>
  );
}
