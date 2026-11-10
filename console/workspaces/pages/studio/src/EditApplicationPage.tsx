import { Checkmark, AiGenerate, Close } from "@carbon/react/icons";
import { useId, useState } from "react";
import { Button, Stack, TextArea, Tile } from "@carbon/react";

import { useNavigate, useParams } from "react-router-dom";
import { useCan, useGetApplication, useListEntities, usePlanApplicationEdit, useUpdateApplication } from "@workspacenow/api-client";
import { buildPath, planFromApplication, routes, validatePlan, validatePlanChanges, type Application, type Entity } from "@workspacenow/types";
import { PageLayout, QueryState, errorMessage } from "@workspacenow/views";
import { Notice, ProblemNotice } from "./subComponents/Notice";
import { PlanBanner } from "./subComponents/PlanBanner";
import { PlanEditor } from "./subComponents/PlanEditor";
import styles from "./EditApplicationPage.module.scss";

/** Edits an application's plan in place: details, pages, new entities and fields, and safe changes to existing ones. */
function ApplicationEditor({ app, entities }: { app: Application; entities: Entity[] }) {
  const navigate = useNavigate();
  const canBuild = useCan("studio.manage");
  const update = useUpdateApplication();
  const planEdit = usePlanApplicationEdit();
  const [prompt, setPrompt] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const aiPromptId = useId();
  // The plan as loaded is both the baseline for "unsaved changes" and the schema records depend on.
  const [initial] = useState(() => planFromApplication(app, entities));
  const [plan, setPlan] = useState(initial);
  const saved = initial.entities;
  const others = entities.filter((e) => !saved.some((s) => s.name === e.name)).map((e) => ({ name: e.name, label: e.label }));
  const problems = [...validatePlan(plan, others.map((e) => e.name)), ...validatePlanChanges(saved, plan)];
  const dirty = JSON.stringify(plan) !== JSON.stringify(initial);
  const detailPath = buildPath(routes.studio.application, { appId: app.id });

  return (
    <Stack gap={6}>
      {!canBuild && <Notice>Editing applications needs studio.manage. Switch to Sahan Gunawardena (Application Developer) or Amaya Perera.</Notice>}
      <PlanBanner
        badge={dirty ? "Unsaved changes" : "No changes"}
        name={plan.name}
        description="Saving applies the changes right away. Existing entities and fields keep their name and type because records depend on them; new entities get CRUD operations in the application's API."
        actions={
          <>
            <Button kind="tertiary" renderIcon={Close} onClick={() => navigate(detailPath)}>
              Discard
            </Button>
            <Button
              renderIcon={Checkmark}
              disabled={!dirty || problems.length > 0 || !canBuild || update.isPending}
              onClick={() => update.mutate({ appId: app.id, plan }, { onSuccess: () => navigate(detailPath) })}
            >
              Save changes
            </Button>
          </>
        }
      />
      <Tile>
        <div className={styles.aiHead}>
          <div className={styles.aiText}>
            <span className={styles.aiTitle}>Edit with AI</span>
            <p className={styles.aiBody}>
              Describe the change and the Application Architect revises the plan. Nothing is saved until you review and press Save changes.
            </p>
          </div>
          <Button kind="tertiary" renderIcon={AiGenerate} onClick={() => setAiOpen((v) => !v)} disabled={!canBuild}>
            {aiOpen ? "Close" : "Ask the Architect"}
          </Button>
        </div>
        {aiOpen && (
          <div className={styles.aiForm}>
            <Stack gap={3}>
              <TextArea
                id={aiPromptId}
                labelText="Describe the change"
                hideLabel
                placeholder="e.g. Add a comments field to PurchaseRequest and a page to review open orders"
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <div>
                <Button
                  size="sm"
                  renderIcon={AiGenerate}
                  disabled={prompt.trim().length < 8 || planEdit.isPending || !canBuild}
                  onClick={() =>
                    planEdit.mutate(
                      { appId: app.id, prompt: prompt.trim() },
                      { onSuccess: (revised) => { setPlan(revised); setAiOpen(false); } },
                    )
                  }
                >
                  Revise plan
                </Button>
              </div>
              {!!planEdit.error && <Notice status="danger">{errorMessage(planEdit.error)}</Notice>}
            </Stack>
          </div>
        )}
      </Tile>
      <ProblemNotice heading="Fix these before saving:" problems={problems} />
      {!!update.error && <Notice status="danger">{errorMessage(update.error)}</Notice>}
      <PlanEditor plan={plan} onChange={setPlan} existingEntities={others} saved={saved} />
    </Stack>
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
