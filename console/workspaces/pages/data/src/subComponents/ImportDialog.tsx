import { useState } from "react";
import { Button, ComposedModal, ModalBody, ModalFooter, ModalHeader } from "@carbon/react";
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
    <ComposedModal open onClose={onClose} size="md">
      <ModalHeader title={`Import into ${entity.label}`} closeModal={onClose} />
      <ModalBody className="grid gap-4">
        {done !== undefined ? (
          <p className="text-sm">Imported {done} record{done === 1 ? "" : "s"}.</p>
        ) : (
          <>
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
            <input
              type="file"
              accept={format === "csv" ? ".csv,text/csv" : ".json,application/json"}
              aria-label="Or load a file"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setData(await f.text());
                e.target.value = "";
              }}
            />
            {!!imp.error && <p className="text-sm text-danger">{errorMessage(imp.error)}</p>}
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="tertiary" onClick={onClose}>
          Close
        </Button>
        {done === undefined && (
          <Button
            kind="primary"
            disabled={!data.trim() || imp.isPending}
            onClick={() => imp.mutate({ entityName: entity.name, format, data }, { onSuccess: (r) => setDone(r.created) })}
          >
            Import
          </Button>
        )}
      </ModalFooter>
    </ComposedModal>
  );
}
