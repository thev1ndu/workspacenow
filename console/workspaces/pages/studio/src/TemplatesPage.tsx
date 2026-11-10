import { Add } from "@carbon/react/icons";
import { useState } from "react";
import { Button, CodeSnippet, Modal } from "@carbon/react";

import { useNavigate } from "react-router-dom";
import { useCan, useInstallTemplate, useListTemplates } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import type { Template } from "@workspacenow/types";
import { NoDataFound, PageLayout, QueryState, SectionCard, TextInput } from "@workspacenow/views";
import shared from "./shared.module.scss";
import styles from "./TemplatesPage.module.scss";

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
            <div className={styles.grid}>
              {data.items.map((t) => (
                <SectionCard
                  key={t.id}
                  title={t.name}
                  subtitle={`${t.category} · v${t.version}`}
                  actions={
                    <Button size="sm" kind="primary" renderIcon={Add} disabled={!canBuild} onClick={() => { setSelected(t); setName(t.name); }}>
                      Install
                    </Button>
                  }
                >
                  <p className={shared.body}>{t.description}</p>
                  <div className={styles.signature}>
                    <CodeSnippet type="inline" hideCopyButton>{`signed ${t.signature.slice(0, 16)}…`}</CodeSnippet>
                  </div>
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
          primaryButtonText="Install"
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
