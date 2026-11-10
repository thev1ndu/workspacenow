import { useState } from "react";
import { Button, Modal } from "@carbon/react";
import { Layers, Plus } from "@workspacenow/icons";
import { useNavigate } from "react-router-dom";
import { useCan, useInstallTemplate, useListTemplates } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import type { Template } from "@workspacenow/types";
import { NoDataFound, PageLayout, QueryState, SectionCard, TextInput } from "@workspacenow/views";

export function TemplatesPage() {
  const templates = useListTemplates();
  const install = useInstallTemplate();
  const canBuild = useCan("studio.manage");
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Template>();
  const [name, setName] = useState("");

  return (
    <PageLayout
      title="Templates"
      description="Curated, publisher-signed application blueprints. Install one to get a working app in seconds."
    >
      <QueryState query={templates}>
        {(data) =>
          data.items.length === 0 ? (
            <NoDataFound message="No templates available." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.items.map((t) => (
                <SectionCard
                  key={t.id}
                  title={t.name}
                  subtitle={`${t.category} · v${t.version}`}
                  actions={
                    <Button size="sm" kind="primary" disabled={!canBuild} onClick={() => { setSelected(t); setName(t.name); }}>
                      <Plus className="size-3.5" aria-hidden />
                      Install
                    </Button>
                  }
                >
                  <p className="text-sm text-muted">{t.description}</p>
                  <p className="mt-2 font-mono text-xs text-muted">signed {t.signature.slice(0, 16)}…</p>
                </SectionCard>
              ))}
            </div>
          )
        }
      </QueryState>
      {selected && (
        <Modal
          open
          size="md"
          modalHeading={`Install ${selected.name}`}
          onRequestClose={() => setSelected(undefined)}
          secondaryButtonText="Cancel"
          onSecondarySubmit={() => setSelected(undefined)}
          primaryButtonText={
            <>
              <Layers className="size-4" aria-hidden />
              Install
            </>
          }
          primaryButtonDisabled={!name.trim() || install.isPending}
          loadingStatus={install.isPending ? "active" : "inactive"}
          loadingDescription="Installing"
          onRequestSubmit={() =>
            install.mutate(
              { templateId: selected.id, body: { name: name.trim() } },
              { onSuccess: (app) => navigate(buildPath(routes.studio.application, { appId: app.id })) },
            )
          }
        >
          <TextInput label="Application name" value={name} onChange={setName} />
        </Modal>
      )}
    </PageLayout>
  );
}
