import { useState } from "react";
import { FileUploaderButton, InlineNotification, Modal, Stack } from "@carbon/react";
import { useImportRecords } from "@workspacenow/api-client";
import type { Entity } from "@workspacenow/types";
import { SelectInput, TextInput, errorMessage } from "@workspacenow/views";

/** CSV/JSON import: paste rows or a file's text, pick the format, POST to the import endpoint. */
export function ImportDialog({ entity, onClose }: { entity: Entity; onClose: () => void }) {
  const [format, setFormat] = useState<"json" | "csv">("csv");
  const [data, setData] = useState("");
  const [done, setDone] = useState<number>();
  const imp = useImportRecords();

  return (
    <Modal
      open
      size="md"
      modalLabel={entity.label}
      modalHeading={`Import into ${entity.label}`}
      passiveModal={done !== undefined}
      primaryButtonText="Import"
      secondaryButtonText="Close"
      primaryButtonDisabled={!data.trim() || imp.isPending}
      onRequestClose={onClose}
      onRequestSubmit={() => imp.mutate({ entityName: entity.name, format, data }, { onSuccess: (r) => setDone(r.created) })}
    >
      {done !== undefined ? (
        <InlineNotification kind="success" lowContrast hideCloseButton title={`Imported ${done} record${done === 1 ? "" : "s"}.`} />
      ) : (
        <Stack gap={5}>
          <SelectInput
            label="Format"
            value={format}
            onChange={(v) => setFormat(v as "json" | "csv")}
            options={[
              { value: "csv", label: "CSV (header row = field names)" },
              { value: "json", label: "JSON (array of objects)" },
            ]}
          />
          <TextInput
            label={format === "csv" ? "CSV text" : "JSON text"}
            multiline
            rows={10}
            value={data}
            onChange={setData}
            placeholder={format === "csv" ? "sku,name,unitPrice\nGR-1,Rice,12.5" : '[{"sku":"GR-1","name":"Rice"}]'}
          />
          <FileUploaderButton
            labelText="Or load a file"
            buttonKind="tertiary"
            size="md"
            disableLabelChanges
            accept={format === "csv" ? [".csv", "text/csv"] : [".json", "application/json"]}
            onChange={async (e) => {
              const input = e.target;
              const f = input.files?.[0];
              if (f) setData(await f.text());
              input.value = "";
            }}
          />
          {!!imp.error && <InlineNotification kind="error" lowContrast hideCloseButton title={errorMessage(imp.error)} />}
        </Stack>
      )}
    </Modal>
  );
}
