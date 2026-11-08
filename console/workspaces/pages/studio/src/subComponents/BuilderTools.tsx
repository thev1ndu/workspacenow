import { useState } from "react";
import { Alert, Button, ListBox, Select, Table } from "@heroui/react";
import { Gear, Rocket } from "@workspacenow/icons";
import { useDiffApplication, useListReleases, usePreviewApplication, useSetApplicationTheme } from "@workspacenow/api-client";
import type { Application } from "@workspacenow/types";
import { NoDataFound, QueryState, SectionCard, StatusChip, TextInput } from "@workspacenow/views";

/** Build tab: sandbox preview, business-language release diff, app theme. */
export function BuilderTools({ app }: { app: Application }) {
  const releases = useListReleases({ appId: app.id });
  const preview = usePreviewApplication();
  const setTheme = useSetApplicationTheme();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [color, setColor] = useState(app.theme?.primaryColor ?? "#6d28d9");
  const [logoUrl, setLogoUrl] = useState(app.theme?.logoUrl ?? "");
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
    <div className="grid gap-5">
      <SectionCard
        title="Sandbox preview"
        subtitle="Deploy the current draft to a sandbox and seed each entity with 5 sample records."
        actions={
          <Button
            size="sm"
            variant="secondary"
            isPending={preview.isPending}
            onPress={() => preview.mutate({ appId: app.id })}
          >
            <Rocket className="size-3.5" aria-hidden />
            Preview app
          </Button>
        }
      >
        {previewData && (
          <Alert color="success"><Alert.Indicator /><Alert.Content><Alert.Title>{`Preview deployed: ${previewData.recordsSeeded} sample records seeded`}</Alert.Title><Alert.Description><a className="underline" href={previewData.url}>Open the preview ({previewData.url})</a></Alert.Description></Alert.Content></Alert>
        )}
        {previewErr && <Alert color="danger"><Alert.Indicator /><Alert.Content><Alert.Title>Preview failed</Alert.Title><Alert.Description>{previewErr.message}</Alert.Description></Alert.Content></Alert>}
      </SectionCard>

      <SectionCard title="Release diff" subtitle="Business-language diff between two releases or the current draft.">
        <div className="mb-3 grid grid-cols-2 gap-3">
          <Select aria-label="From version" selectedKey={from || null} onChange={(k) => setFrom(String(k))}>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>{versionOptions.map((o) => (<ListBox.Item key={o.key} id={o.key} textValue={o.label}>{o.label}<ListBox.ItemIndicator /></ListBox.Item>))}</ListBox>
            </Select.Popover>
          </Select>
          <Select aria-label="To version" selectedKey={to || null} onChange={(k) => setTo(String(k))}>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>{versionOptions.map((o) => (<ListBox.Item key={o.key} id={o.key} textValue={o.label}>{o.label}<ListBox.ItemIndicator /></ListBox.Item>))}</ListBox>
            </Select.Popover>
          </Select>
        </div>
        {from && to && (
          <QueryState query={diff}>
            {(d) =>
              d.changes.length === 0 ? (
                <NoDataFound message="No changes between the selected versions." />
              ) : (
                <Table variant="secondary">
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Blueprint diff" className="min-w-[640px]">
                      <Table.Header>
                        <Table.Column isRowHeader>Change</Table.Column>
                        <Table.Column>Kind</Table.Column>
                        <Table.Column>Item</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {d.changes.map((c, i) => (
                          <Table.Row key={`${c.kind}:${c.change}:${c.name}:${i}`} id={`${c.name}-${i}`}>
                            <Table.Cell>
                              <StatusChip status={c.change === "added" ? "healthy" : c.change === "removed" ? "down" : "degraded"} label={c.change} />
                            </Table.Cell>
                            <Table.Cell className="text-muted">{c.kind}</Table.Cell>
                            <Table.Cell>
                              <p className="text-sm font-medium">{c.name}</p>
                              <p className="text-xs text-muted">{c.detail}</p>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
              )
            }
          </QueryState>
        )}
      </SectionCard>

      <SectionCard title="App theme" subtitle="Logo and primary color used when this app opens full screen.">
        <div className="grid max-w-md gap-3">
          <TextInput label="Primary color (hex)" value={color} onChange={setColor} placeholder="#6d28d9" />
          <TextInput label="Logo URL" value={logoUrl} onChange={setLogoUrl} placeholder="https://example.com/logo.svg" />
          <div>
            <Button
              size="sm"
              variant="secondary"
              isPending={setTheme.isPending}
              onPress={() => setTheme.mutate({ appId: app.id, body: { primaryColor: color, logoUrl } })}
            >
              <Gear className="size-3.5" aria-hidden />
              Save theme
            </Button>
          </div>
          {themeErr && <Alert color="danger"><Alert.Indicator /><Alert.Content><Alert.Title>Invalid theme</Alert.Title><Alert.Description>{themeErr.message}</Alert.Description></Alert.Content></Alert>}
          {themeSaved && <Alert color="success"><Alert.Indicator /><Alert.Content><Alert.Title>Theme saved</Alert.Title><Alert.Description>{themeSaved.theme?.primaryColor}</Alert.Description></Alert.Content></Alert>}
        </div>
      </SectionCard>
    </div>
  );
}
