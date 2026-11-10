import { ApiError, conditionHolds, nextStep, readPath, startStep, validateWorkflow, type Approval, type ExecutionStep, type Permission, type PlatformEvent, type Workflow, type WorkflowDefinition, type WorkflowExecution } from "@workspacenow/types";
import { runAgent } from "./agents";
import { fail, PermissionSet, type ExecutionContext, type Platform } from "./platform";

/** An approval with who started the run it belongs to, as wsn-service stores it; they may not decide it. */
export type RequestedApproval = Approval & { requestedBy?: string; requestedByName?: string };

/** Whether the user started the run the approval belongs to. */
export function isRequester(approval: RequestedApproval, userId: string, userName: string): boolean {
  return approval.requestedBy ? approval.requestedBy === userId : Boolean(approval.requestedByName) && approval.requestedByName === userName;
}

function workflowContext(workflow: Workflow, traceId: string): ExecutionContext {
  return {
    actor: { kind: "workflow", id: workflow.id, name: workflow.name },
    permissions: new PermissionSet(workflow.permissions),
    traceId,
    entryPoint: "workflow",
  };
}

function render(template: string, values: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => String(values[key] ?? ""));
}

/** Starts every active workflow subscribed to the event. */
export function dispatchEvent(platform: Platform, event: PlatformEvent): void {
  for (const workflow of platform.state.workflows) {
    if (workflow.status !== "active") continue;
    if (workflow.trigger.kind === "entity-event" && workflow.trigger.event === event.type) {
      const context: Record<string, unknown> = { ...event.payload, triggeredBy: event.type };
      // An agent acting for a person counts as that person, so its approvals keep separation of duties.
      const actor = platform.eventActor(event.id);
      if (actor?.kind === "user") Object.assign(context, { triggeredById: actor.id, triggeredByName: actor.name });
      else if (actor?.onBehalfOf) context.triggeredByName = actor.onBehalfOf;
      startExecution(platform, workflow, event.traceId, context);
    }
  }
}

export function startExecution(
  platform: Platform,
  workflow: Workflow,
  traceId: string,
  context: Record<string, unknown>,
): WorkflowExecution {
  const execution: WorkflowExecution = {
    id: platform.nextId("exec"),
    workflowId: workflow.id,
    traceId,
    status: "running",
    context,
    steps: workflow.steps.map((s) => ({ stepId: s.id, status: "pending" })),
    startedAt: platform.now(),
  };
  platform.state.executions.push(execution);
  platform.audit(workflowContext(workflow, traceId), "workflow.start", `workflow/${workflow.id}`, "allowed", `Execution ${execution.id}`);
  advance(platform, execution, startStep(workflow));
  return execution;
}

/** The execution's record of a step, added when a definition edited mid-run introduces it. */
function stepState(execution: WorkflowExecution, stepId: string): ExecutionStep {
  let state = execution.steps.find((s) => s.stepId === stepId);
  if (!state) {
    state = { stepId, status: "pending" };
    execution.steps.push(state);
  }
  return state;
}

function finish(platform: Platform, execution: WorkflowExecution, workflow: Workflow): void {
  // Steps on branches the run did not take never ran.
  for (const s of execution.steps) if (s.status === "pending") s.status = "skipped";
  execution.status = "completed";
  execution.endedAt = platform.now();
  platform.audit(workflowContext(workflow, execution.traceId), "workflow.complete", `workflow/${workflow.id}`, "allowed", `Execution ${execution.id}`);
}

/** Follows the flow from a step until the execution completes, fails, or waits on a human. */
function advance(platform: Platform, execution: WorkflowExecution, from: string | null): void {
  const workflow = platform.state.workflows.find((w) => w.id === execution.workflowId)!;
  const ctx = workflowContext(workflow, execution.traceId);
  let current = from;
  // Saved flows cannot loop (validateWorkflow), but a bound keeps a bad definition from hanging the demo.
  for (let guard = 0; current && guard <= workflow.steps.length; guard += 1) {
    const step = workflow.steps.find((s) => s.id === current);
    if (!step) {
      execution.status = "failed";
      execution.endedAt = platform.now();
      platform.audit(ctx, "workflow.step", `workflow/${workflow.id}`, "failed", `Step ${current} no longer exists`);
      return;
    }
    const state = stepState(execution, step.id);
    state.status = "running";
    state.startedAt = platform.now();
    let following = nextStep(workflow, step);
    try {
      switch (step.kind) {
        case "agent": {
          const run = runAgent(platform, step.agentId, render(step.prompt, execution.context), {
            trigger: "workflow",
            onBehalfOf: workflow.name,
            traceId: execution.traceId,
            context: execution.context,
          });
          const created = run.steps.flatMap((s) =>
            s.kind === "tool" && s.call.tool === "create_purchase_request" && s.call.outcome === "allowed"
              ? [(s.call.output as { id: string }).id]
              : [],
          );
          execution.context.agentRunId = run.id;
          if (created.length === 0) throw new Error(run.answer);
          execution.context.purchaseRequestId = created[0];
          state.detail = run.answer;
          break;
        }
        case "approval": {
          const requestId = String(execution.context.purchaseRequestId ?? "");
          const request = requestId ? platform.records("PurchaseRequest").find((r) => r.id === requestId) : undefined;
          const requestedBy = typeof execution.context.triggeredById === "string" ? execution.context.triggeredById : undefined;
          const requestedByName = typeof execution.context.triggeredByName === "string"
            ? execution.context.triggeredByName
            : requestedBy && typeof execution.context.triggeredBy === "string" ? execution.context.triggeredBy : undefined;
          const approval: RequestedApproval = {
            id: platform.nextId("appr"),
            executionId: execution.id,
            workflowId: workflow.id,
            stepId: step.id,
            traceId: execution.traceId,
            title: step.name,
            summary: request
              ? `${request.values.quantity} units for ${execution.context.store ?? request.values.store}, estimated LKR ${Number(request.values.estimatedCost).toLocaleString("en-US")}. ${request.values.justification}`
              : step.description,
            permission: step.permission,
            subject: request ? { entity: "PurchaseRequest", recordId: request.id, applicationId: workflow.applicationId } : undefined,
            status: "pending",
            requestedAt: platform.now(),
            requestedBy,
            requestedByName,
          };
          platform.state.approvals.push(approval);
          platform.audit(ctx, "approval.request", `approval/${approval.id}`, "allowed", step.description);
          state.status = "waiting";
          state.detail = `Waiting for a user with ${step.permission}`;
          execution.status = "waiting";
          return;
        }
        case "operation": {
          const output = platform.invoke<{ id?: string; values?: Record<string, unknown> }>(ctx, step.businessOperation, execution.context);
          const created = output?.values?.orderNumber ?? output?.id;
          state.detail = created ? `Created ${created}` : "Done";
          if (output?.id) execution.context[`${step.businessOperation.split(".")[1]}Id`] = output.id;
          // Later steps can template on the created record's fields; existing context wins.
          for (const [key, value] of Object.entries(output?.values ?? {})) {
            if (!(key in execution.context)) execution.context[key] = value;
          }
          break;
        }
        case "notify": {
          const message = render(step.message, execution.context);
          platform.publish(ctx, "Notification.Sent", `workflow:${workflow.id}`, { channel: step.channel, message });
          platform.audit(ctx, "notify", step.channel, "allowed", message);
          state.detail = message;
          break;
        }
        case "condition": {
          const actual = readPath(execution.context, step.field);
          const holds = conditionHolds(actual, step.operator, step.value);
          following = holds ? step.then : step.otherwise;
          state.detail = `${step.field} is ${actual === undefined ? "not set" : JSON.stringify(actual)}: ${holds ? "yes" : "no"} branch`;
          break;
        }
        case "wait": {
          // The demo has no clock to sleep on, so the wait is recorded and the run moves straight on.
          state.detail = `Waited ${step.minutes} min (immediate in this demo)`;
          break;
        }
      }
      state.status = "completed";
      state.endedAt = platform.now();
    } catch (error) {
      state.status = "failed";
      state.endedAt = platform.now();
      state.detail = error instanceof Error ? error.message : String(error);
      execution.status = "failed";
      execution.endedAt = platform.now();
      if (!(error instanceof ApiError)) {
        platform.audit(ctx, `workflow.step.${step.kind}`, `workflow/${workflow.id}`, "failed", state.detail);
      }
      return;
    }
    current = following;
  }
  finish(platform, execution, workflow);
}

/**
 * A human decision on a waiting approval. The decision itself is a Business Operation
 * run as the deciding user, inside the execution's trace.
 */
export function decideApproval(
  platform: Platform,
  userId: string,
  approvalId: string,
  decision: "approved" | "rejected",
  comment: string,
): Approval {
  const approval = platform.state.approvals.find((a) => a.id === approvalId);
  if (!approval) fail(404, "NOT_FOUND", `Approval ${approvalId} not found`);
  const ctx = platform.userContext(userId, "studio", approval.traceId);
  if (approval.status !== "pending") fail(409, "INVALID_STATE", `Approval is already ${approval.status}`, ctx.traceId);
  const action = `approval.${decision === "approved" ? "approve" : "reject"}`;
  platform.requirePermission(ctx, approval.permission, action, `approval/${approval.id}`);
  if (isRequester(approval, ctx.actor.id, ctx.actor.name)) {
    platform.audit(ctx, action, `approval/${approval.id}`, "denied", "Requester cannot decide their own request");
    fail(403, "FORBIDDEN", "You started this request, so someone else has to decide it", ctx.traceId);
  }

  if (approval.subject?.entity === "PurchaseRequest") {
    platform.invoke(
      ctx,
      decision === "approved" ? "procurement.approvePurchaseRequest" : "procurement.rejectPurchaseRequest",
      { purchaseRequestId: approval.subject.recordId },
    );
  }
  approval.status = decision;
  approval.decidedAt = platform.now();
  approval.decidedBy = ctx.actor.name;
  approval.comment = comment;

  const execution = platform.state.executions.find((e) => e.id === approval.executionId)!;
  const workflow = platform.state.workflows.find((w) => w.id === execution.workflowId)!;
  const state = stepState(execution, approval.stepId);
  state.status = "completed";
  state.endedAt = platform.now();
  state.detail = `${decision === "approved" ? "Approved" : "Rejected"} by ${ctx.actor.name}${comment ? `: ${comment}` : ""}`;
  execution.status = "running";
  execution.context.approval = decision;
  const step = workflow.steps.find((s) => s.id === approval.stepId);
  // Approved runs carry on; rejected ones take the step's rejection path, or end.
  const following = !step ? null : decision === "approved" ? nextStep(workflow, step) : step.kind === "approval" ? (step.onReject ?? null) : null;
  advance(platform, execution, following);
  return approval;
}

export function runManually(platform: Platform, userId: string, workflowId: string, input: Record<string, unknown>): WorkflowExecution {
  const workflow = platform.state.workflows.find((w) => w.id === workflowId);
  if (!workflow) fail(404, "NOT_FOUND", `Workflow ${workflowId} not found`);
  const ctx = platform.userContext(userId, "workflow");
  platform.requirePermission(ctx, "flow.manage", "workflow.run", `workflow/${workflow.id}`);
  // The run acts with the workflow's permissions, so starting it must not exceed the starter's own.
  for (const p of workflow.permissions) platform.requirePermission(ctx, p, "workflow.run", `workflow/${workflow.id}`);
  if (workflow.status !== "active") fail(409, "INVALID_STATE", `${workflow.name} is ${workflow.status}`);
  return startExecution(platform, workflow, ctx.traceId, { ...input, triggeredBy: ctx.actor.name, triggeredById: ctx.actor.id });
}

/** Saves a workflow whose identity gets exactly what its operation steps need; the author must hold all of it. */
export function saveWorkflow(platform: Platform, ctx: ExecutionContext, workflowId: string | undefined, definition: WorkflowDefinition): Workflow {
  const existing = workflowId ? platform.state.workflows.find((w) => w.id === workflowId) : undefined;
  if (workflowId && !existing) fail(404, "NOT_FOUND", `Workflow ${workflowId} not found`);
  platform.requirePermission(ctx, "flow.manage", existing ? "workflow.update" : "workflow.create", existing ? `workflow/${existing.id}` : "workflow");

  const operations = platform.listOperations();
  const problems = validateWorkflow(definition, {
    agentIds: platform.state.agents.map((a) => a.id),
    businessOperations: operations.map((o) => o.name),
    permissions: [...new Set(platform.state.roles.flatMap((r) => r.permissions))],
  });
  if (problems.length > 0) fail(422, "VALIDATION_FAILED", problems.slice(0, 3).join("; "), ctx.traceId);

  const needed = [...new Set(definition.steps.flatMap((s) => (s.kind === "operation" ? [operations.find((o) => o.name === s.businessOperation)!.permission] : [])))] as Permission[];
  const granted = needed.filter((p) => !ctx.permissions.has(p));
  if (granted.length > 0) {
    platform.audit(ctx, "workflow.save", existing ? `workflow/${existing.id}` : "workflow", "denied", `Would grant ${granted.join(", ")}`);
    fail(403, "FORBIDDEN", `You cannot give a workflow permissions you do not hold: ${granted.join(", ")}`, ctx.traceId);
  }

  const fields = {
    name: definition.name.trim(),
    description: definition.description,
    trigger: definition.trigger,
    steps: definition.steps,
    start: definition.start,
    triggerPosition: definition.triggerPosition,
    applicationId: definition.applicationId,
    permissions: needed,
  };
  let workflow: Workflow;
  if (existing) {
    Object.assign(existing, fields, { version: existing.version + 1 });
    workflow = existing;
  } else {
    workflow = { id: platform.nextId("wf"), ...fields, version: 1, status: "paused" };
    platform.state.workflows.push(workflow);
  }
  platform.audit(ctx, existing ? "workflow.update" : "workflow.create", `workflow/${workflow.id}`, "allowed", `Version ${workflow.version}`);
  return workflow;
}
