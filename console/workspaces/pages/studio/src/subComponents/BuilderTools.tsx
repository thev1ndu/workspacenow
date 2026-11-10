import { Settings, Rocket } from "@carbon/react/icons";
import { useId, useState } from "react";
import { Button, InlineNotification, Link, Select, SelectItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@carbon/react";

import { useDiffApplication, useListReleases, usePreviewApplication, useSetApplicationTheme } from "@workspacenow/api-client";
import type { Application } from "@workspacenow/types";
import { NoDataFound, QueryState, SectionCard, StatusChip, TextInput } from "@workspacenow/views";

import styles from "./BuilderTools.module.scss";

/** Build tab: sandbox preview, business-language release diff, app theme. */
export function BuilderTools({ app }: { app: Application }) {
  const releases = useListReleases({ appId: app.id });
  const preview = usePreviewApplication();
  const setTheme = useSetApplicationTheme();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [color, setColor] = useState(app.theme?.primaryColor ?? "#6d28d9");
  const [logoUrl, setLogoUrl] = useState(app.theme?.logoUrl ?? "");
  const fromId = useId();
  const toId = useId();
  const diff = useDiffApplication({ appId: app.id, from, to });
  const previewData = preview.data;
  const previewErr = preview.error as Error | null;
  const themeSaved = setTheme.data;
  const themeErr = setTheme.error as Error | null;

  const versionOptions = [
    { key: "current", label: `current draft (v${app.version})` },
    ...(releases.data?.items ?? []).map((r) => ({ key: r.version, label: `v${r.version}` })),
  ];

  return (
    <Stack gap={6}>
      <SectionCard
        title="Sandbox preview"
        subtitle="Deploy the current draft to a sandbox and seed each entity with 5 sample records."
        actions={
          <Button
            size="sm"
            kind="secondary"
            renderIcon={Rocket}
            disabled={preview.isPending}
            onClick={() => preview.mutate({ appId: app.id })}
          >
            Preview app
          </Button>
        }
      >
        {previewData && (
          <InlineNotification
            kind="success"
            lowContrast
            hideCloseButton
            title={`Preview deployed: ${previewData.recordsSeeded} sample records seeded`}
          >
            <Link href={previewData.url}>Open the preview ({previewData.url})</Link>
          </InlineNotification>
        )}
        {previewErr && (
          <InlineNotification kind="error" lowContrast hideCloseButton title="Preview failed" subtitle={previewErr.message} />
        )}
      </SectionCard>

      <SectionCard title="Release diff" subtitle="Business-language diff between two releases or the current draft.">
        <div className={styles.versions}>
          <Select id={fromId} aria-label="From version" value={from} onChange={(e) => setFrom(e.target.value)}>
            <SelectItem value="" text="Select…" hidden />
            {versionOptions.map((o) => (
              <SelectItem key={o.key} value={o.key} text={o.label} />
            ))}
          </Select>
          <Select id={toId} aria-label="To version" value={to} onChange={(e) => setTo(e.target.value)}>
            <SelectItem value="" text="Select…" hidden />
            {versionOptions.map((o) => (
              <SelectItem key={o.key} value={o.key} text={o.label} />
            ))}
          </Select>
        </div>
        {from && to && (
          <QueryState query={diff}>
            {(d) =>
              d.changes.length === 0 ? (
                <NoDataFound message="No changes between the selected versions." />
              ) : (
                <TableContainer aria-label="Blueprint diff">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeader scope="col">Change</TableHeader>
                        <TableHeader scope="col">Kind</TableHeader>
                        <TableHeader scope="col">Item</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {d.changes.map((c, i) => (
                        <TableRow key={`${c.kind}:${c.change}:${c.name}:${i}`} id={`${c.name}-${i}`}>
                          <TableCell>
                            <StatusChip status={c.change === "added" ? "healthy" : c.change === "removed" ? "down" : "degraded"} label={c.change} />
                          </TableCell>
                          <TableCell>{c.kind}</TableCell>
                          <TableCell>
                            <p className={styles.change}>{c.name}</p>
                            <p className={styles.detail}>{c.detail}</p>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )
            }
          </QueryState>
        )}
      </SectionCard>

      <SectionCard title="App theme" subtitle="Logo and primary color used when this app opens full screen.">
        <div className={styles.theme}>
          <Stack gap={5}>
          <TextInput label="Primary color (hex)" value={color} onChange={setColor} placeholder="#6d28d9" />
          <TextInput label="Logo URL" value={logoUrl} onChange={setLogoUrl} placeholder="https://example.com/logo.svg" />
          <div>
            <Button
              size="sm"
              kind="secondary"
              renderIcon={Settings}
              disabled={setTheme.isPending}
              onClick={() => setTheme.mutate({ appId: app.id, body: { primaryColor: color, logoUrl } })}
            >
              Save theme
            </Button>
          </div>
          {themeErr && <InlineNotification kind="error" lowContrast hideCloseButton title="Invalid theme" subtitle={themeErr.message} />}
          {themeSaved && (
            <InlineNotification kind="success" lowContrast hideCloseButton title="Theme saved" subtitle={themeSaved.theme?.primaryColor} />
          )}
          </Stack>
        </div>
      </SectionCard>
    </Stack>
  );
}
