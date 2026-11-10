import { Checkmark, Edit, AiGenerate, Close } from "@carbon/react/icons";
import { useState } from "react";
import { Button, Stack, Tab, TabList, TabPanel, TabPanels, Tabs } from "@carbon/react";

import { useNavigate } from "react-router-dom";
import { useApplyApplicationPlan, useCan, useListEntities, usePlanApplication } from "@workspacenow/api-client";
import { buildPath, routes, validatePlan, type ApplicationPlan } from "@workspacenow/types";
import { PageLayout, SectionCard, TextInput, errorMessage } from "@workspacenow/views";
import { Notice, ProblemNotice } from "./subComponents/Notice";
import { PlanBanner } from "./subComponents/PlanBanner";
import { PlanEditor, blankPlan } from "./subComponents/PlanEditor";
import shared from "./shared.module.scss";
import styles from "./BuilderPage.module.scss";

const EXAMPLES = [
  {
    label: "Employee management",
    prompt:
      "Build an employee management application with employee registration, department assignment, document management, leave requests and approval workflows.",
  },
  { label: "Customer support", prompt: "Create a customer support application to track customer tickets by priority and status." },
  { label: "Asset tracking", prompt: "Build an asset tracking application for store equipment with maintenance history." },
];

export function BuilderPage() {
  const navigate = useNavigate();
  const canBuild = useCan("studio.manage");
  const planApplication = usePlanApplication();
  const applyPlan = useApplyApplicationPlan();
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<ApplicationPlan | null>(null);
  const entities = useListEntities();
  const existingEntities = (entities.data?.items ?? []).map((e) => ({ name: e.name, label: e.label }));
  const problems = plan ? validatePlan(plan, existingEntities.map((e) => e.name)) : [];

  return (
    <PageLayout
      title="Builder"
      description="Start from a description and let the Application Architect draft the plan, or design it yourself. Either way you edit the plan, and nothing is created until you approve."
      backHref={routes.studio.applications}
      backLabel="Applications"
    >
      <Stack gap={6}>
        {!canBuild && (
          <Notice>Building applications needs studio.manage. Switch to Sahan Gunawardena (Application Developer) or Amaya Perera.</Notice>
        )}
        {!plan && (
          <Tabs>
            <TabList aria-label="How to start">
              <Tab renderIcon={AiGenerate}>Generate with AI</Tab>
              <Tab renderIcon={Edit}>Design it yourself</Tab>
            </TabList>
            <TabPanels>
              <TabPanel className={shared.panel}>
                <SectionCard title="Describe the application" subtitle="Plain language works best: who uses it, what they track, and what needs approval.">
                  <Stack gap={5}>
                    <TextInput label="What should it do?" value={prompt} onChange={setPrompt} multiline rows={3} placeholder="Build an application that…" />
                    <div className={styles.examples}>
                      <span className={styles.examplesLabel}>Start from an example</span>
                      {EXAMPLES.map((example) => (
                        <Button key={example.label} size="sm" kind="tertiary" onClick={() => setPrompt(example.prompt)}>
                          {example.label}
                        </Button>
                      ))}
                    </div>
                    {!!planApplication.error && <Notice status="danger">{errorMessage(planApplication.error)}</Notice>}
                    <div>
                      <Button
                        disabled={!prompt.trim() || planApplication.isPending}
                        onClick={() => planApplication.mutate(prompt, { onSuccess: (result) => setPlan(result) })}
                      >
                        {planApplication.isPending ? "Planning…" : "Generate plan"}
                      </Button>
                    </div>
                  </Stack>
                </SectionCard>
              </TabPanel>
              <TabPanel className={shared.panel}>
                <SectionCard title="Design it yourself" subtitle="Define the entities, fields and pages in the visual editor. The platform generates the CRUD API for you.">
                  <Button disabled={!canBuild} renderIcon={Edit} onClick={() => setPlan(blankPlan())}>
                    Open the editor
                  </Button>
                </SectionCard>
              </TabPanel>
            </TabPanels>
          </Tabs>
        )}

        {plan && (
          <>
            <PlanBanner
              badge={plan.prompt ? "AI draft" : "Manual design"}
              name={plan.name}
              description={
                <>
                  {plan.prompt ? "Drafted by the Application Architect. Edit anything below; " : ""}Creating it adds a draft application, its entities and a CRUD
                  API.
                </>
              }
              actions={
                <>
                  <Button kind="tertiary" renderIcon={Close} onClick={() => setPlan(null)}>
                    Discard
                  </Button>
                  <Button
                    renderIcon={Checkmark}
                    disabled={problems.length > 0 || !canBuild || applyPlan.isPending}
                    onClick={() => applyPlan.mutate(plan, { onSuccess: (app) => navigate(buildPath(routes.studio.application, { appId: app.id })) })}
                  >
                    {plan.prompt ? "Approve and create" : "Create application"}
                  </Button>
                </>
              }
            />
            <ProblemNotice heading="Fix these before creating:" problems={problems} />
            {!!applyPlan.error && <Notice status="danger">{errorMessage(applyPlan.error)}</Notice>}
            <PlanEditor plan={plan} onChange={setPlan} existingEntities={existingEntities} />
          </>
        )}
      </Stack>
    </PageLayout>
  );
}
