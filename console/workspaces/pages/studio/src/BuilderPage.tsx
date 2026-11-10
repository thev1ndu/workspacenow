import { Checkmark, Edit, AiGenerate, Close } from "@carbon/react/icons";
import { useState } from "react";
import { Button, Tab, TabList, TabPanel, TabPanels, Tabs, Tag } from "@carbon/react";

import { useNavigate } from "react-router-dom";
import { useApplyApplicationPlan, useCan, useListEntities, usePlanApplication } from "@workspacenow/api-client";
import { buildPath, routes, validatePlan, type ApplicationPlan } from "@workspacenow/types";
import { PageLayout, SectionCard, TextInput, errorMessage } from "@workspacenow/views";
import { Notice } from "./subComponents/Notice";
import { PlanEditor, blankPlan } from "./subComponents/PlanEditor";

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
      <div className="grid gap-6">
        {!canBuild && (
          <Notice>Building applications needs studio.manage. Switch to Sahan Gunawardena (Application Developer) or Amaya Perera.</Notice>
        )}
        {!plan && (
          <Tabs>
            <TabList aria-label="How to start" className="self-start">
              <Tab>
                <AiGenerate className="size-4" aria-hidden />
                Generate with AI
              </Tab>
              <Tab>
                <Edit className="size-4" aria-hidden />
                Design it yourself
              </Tab>
            </TabList>
            <TabPanels>
              <TabPanel className="mt-5">
                <SectionCard title="Describe the application" subtitle="Plain language works best: who uses it, what they track, and what needs approval.">
                  <div className="grid gap-4">
                    <TextInput label="What should it do?" value={prompt} onChange={setPrompt} multiline rows={3} placeholder="Build an application that…" />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted">Start from an example</span>
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
                  </div>
                </SectionCard>
              </TabPanel>
              <TabPanel className="mt-5">
                <SectionCard title="Design it yourself" subtitle="Define the entities, fields and pages in the visual editor. The platform generates the CRUD API for you.">
                  <Button disabled={!canBuild} onClick={() => setPlan(blankPlan())}>
                    <Edit className="size-4" aria-hidden />
                    Open the editor
                  </Button>
                </SectionCard>
              </TabPanel>
            </TabPanels>
          </Tabs>
        )}

        {plan && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface-secondary px-5 py-4">
              <div className="grid min-w-0 flex-1 gap-1">
                <div className="flex items-center gap-2">
                  <Tag size="sm" type="gray">
                    {plan.prompt ? "AI draft" : "Manual design"}
                  </Tag>
                  <span className="text-sm font-medium">{plan.name || "Untitled application"}</span>
                </div>
                <p className="text-sm text-muted">
                  {plan.prompt ? "Drafted by the Application Architect. Edit anything below; " : ""}Creating it adds a draft application, its entities and a
                  CRUD API.
                </p>
              </div>
              <div className="flex gap-2">
                <Button kind="tertiary" onClick={() => setPlan(null)}>
                  <Close className="size-4" aria-hidden />
                  Discard
                </Button>
                <Button
                  disabled={problems.length > 0 || !canBuild || applyPlan.isPending}
                  onClick={() => applyPlan.mutate(plan, { onSuccess: (app) => navigate(buildPath(routes.studio.application, { appId: app.id })) })}
                >
                  <Checkmark className="size-4" aria-hidden />
                  {plan.prompt ? "Approve and create" : "Create application"}
                </Button>
              </div>
            </div>
            {problems.length > 0 && (
              <Notice>
                <span className="font-medium">Fix these before creating:</span>
                <ul className="mt-1 list-disc pl-5">
                  {problems.slice(0, 6).map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                  {problems.length > 6 && <li>and {problems.length - 6} more</li>}
                </ul>
              </Notice>
            )}
            {!!applyPlan.error && <Notice status="danger">{errorMessage(applyPlan.error)}</Notice>}
            <PlanEditor plan={plan} onChange={setPlan} existingEntities={existingEntities} />
          </>
        )}
      </div>
    </PageLayout>
  );
}
