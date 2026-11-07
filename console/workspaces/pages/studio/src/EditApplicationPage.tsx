import { useState } from "react";
import { Button, Chip, TextArea, TextField } from "@heroui/react";
import { Check, Sparkles, Xmark } from "@workspacenow/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useCan, useGetApplication, useListEntities, usePlanApplicationEdit, useUpdateApplication } from "@workspacenow/api-client";
import { buildPath, planFromApplication, routes, validatePlan, validatePlanChanges, type Application, type Entity } from "@workspacenow/types";
import { PageLayout, QueryState, errorMessage } from "@workspacenow/views";
import { Notice } from "./subComponents/Notice";
import { PlanEditor } from "./subComponents/PlanEditor";

/** Edits an application's plan in place: details, pages, new entities and fields, and safe changes to existing ones. */
function ApplicationEditor({ app, entities }: { app: Application; entities: Entity[] }) {
  const navigate = useNavigate();
  const canBuild = useCan("studio.manage");
  const update = useUpdateApplication();
  const planEdit = usePlanApplicationEdit();
  const [prompt, setPrompt] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  // The plan as loaded is both the baseline for "unsaved changes" and the schema records depend on.
  const [initial] = useState(() => planFromApplication(app, entities));
  const [plan, setPlan] = useState(initial);
  const saved = initial.entities;
  const others = entities.filter((e) => !saved.some((s) => s.name === e.name)).map((e) => ({ name: e.name, label: e.label }));
  const problems = [...validatePlan(plan, others.map((e) => e.name)), ...validatePlanChanges(saved, plan)];
  const dirty = JSON.stringify(plan) !== JSON.stringify(initial);
  const detailPath = buildPath(routes.studio.application, { appId: app.id });

  return (
    <div className="grid gap-6">
      {!canBuild && <Notice>Editing applications needs studio.manage. Switch to Sahan Gunawardena (Application Developer) or Amaya Perera.</Notice>}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface-secondary px-5 py-4">
        <div className="grid min-w-0 flex-1 gap-1">
          <div className="flex items-center gap-2">
            <Chip size="sm" variant="secondary">
              {dirty ? "Unsaved changes" : "No changes"}
            </Chip>
            <span className="text-sm font-medium">{plan.name || "Untitled application"}</span>
          </div>
          <p className="text-sm text-muted">
            Saving applies the changes right away. Existing entities and fields keep their name and type because records depend on them; new
            entities get CRUD operations in the application's API.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="tertiary" onPress={() => navigate(detailPath)}>
            <Xmark className="size-4" aria-hidden />
            Discard
          </Button>
          <Button
            isDisabled={!dirty || problems.length > 0 || !canBuild}
            isPending={update.isPending}
            onPress={() => update.mutate({ appId: app.id, plan }, { onSuccess: () => navigate(detailPath) })}
          >
            <Check className="size-4" aria-hidden />
            Save changes
          </Button>
        </div>
      </div>
      <div className="rounded-2xl bg-surface-secondary px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="grid min-w-0 flex-1 gap-1">
            <span className="text-sm font-medium">Edit with AI</span>
            <p className="text-sm text-muted">
              Describe the change and the Application Architect revises the plan — nothing is saved until you review and press Save changes.
            </p>
          </div>
          <Button variant="tertiary" onPress={() => setAiOpen((v) => !v)} isDisabled={!canBuild}>
            <Sparkles className="size-4" aria-hidden />
            {aiOpen ? "Close" : "Ask the Architect"}
          </Button>
        </div>
        {aiOpen && (
          <div className="mt-3 grid gap-2">
            <TextField aria-label="Describe the change" value={prompt} onChange={setPrompt}>
              <TextArea placeholder="e.g. Add a comments field to PurchaseRequest and a page to review open orders" rows={3} />
            </TextField>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                isDisabled={prompt.trim().length < 8 || planEdit.isPending || !canBuild}
                isPending={planEdit.isPending}
                onPress={() =>
                  planEdit.mutate(
                    { appId: app.id, prompt: prompt.trim() },
                    { onSuccess: (revised) => { setPlan(revised); setAiOpen(false); } },
                  )
                }
              >
                <Sparkles className="size-4" aria-hidden />
                Revise plan
              </Button>
              {!!planEdit.error && <span className="text-sm text-danger">{errorMessage(planEdit.error)}</span>}
            </div>
          </div>
        )}
      </div>
      {problems.length > 0 && (
        <Notice>
          <span className="font-medium">Fix these before saving:</span>
          <ul className="mt-1 list-disc pl-5">
            {problems.slice(0, 6).map((p) => (
              <li key={p}>{p}</li>
            ))}
            {problems.length > 6 && <li>and {problems.length - 6} more</li>}
          </ul>
        </Notice>
      )}
      {!!update.error && <Notice status="danger">{errorMessage(update.error)}</Notice>}
      <PlanEditor plan={plan} onChange={setPlan} existingEntities={others} saved={saved} />
    </div>
  );
}

export function EditApplicationPage() {
  const { appId } = useParams();
  const application = useGetApplication({ appId });
  const entities = useListEntities();

  return (
    <PageLayout
      title={application.data ? `Edit ${application.data.name}` : "Edit application"}
      description="Change the application's details and pages, add entities, or extend the ones it owns."
      backHref={appId ? buildPath(routes.studio.application, { appId }) : routes.studio.applications}
      backLabel={application.data?.name ?? "Application"}
      isLoading={application.isLoading}
    >
      <QueryState query={application}>
        {(app) => <QueryState query={entities}>{(data) => <ApplicationEditor key={app.id} app={app} entities={data.items} />}</QueryState>}
      </QueryState>
    </PageLayout>
  );
}
