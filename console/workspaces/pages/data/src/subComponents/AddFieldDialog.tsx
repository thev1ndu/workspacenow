import { useState } from "react";
import { Button, ComposedModal, InlineNotification, ModalBody, ModalFooter, ModalHeader } from "@carbon/react";
import { useListEntities, useUpdateEntity } from "@workspacenow/api-client";
import type { Entity } from "@workspacenow/types";
import { ErrorAlert } from "./RecordForm";
import { FieldRowEditor, emptyRow, toField, type FieldRow } from "./NewEntityDialog";

export function AddFieldDialog({ entity, open, onClose }: { entity: Entity; open: boolean; onClose: () => void }) {
  const updateEntity = useUpdateEntity();
  const { data: entities } = useListEntities();
  const [row, setRow] = useState<FieldRow>(emptyRow);
  const duplicate = entity.fields.some((f) => f.name === row.name.trim());

  return (
    <ComposedModal open={open} onClose={onClose} size="lg">
      <ModalHeader title={`Add field to ${entity.label}`} closeModal={onClose} />
      <ModalBody className="grid gap-4" hasScrollingContent>
        <p className="text-sm text-muted">Adding a field publishes a new version of the entity definition.</p>
        <FieldRowEditor row={row} onChange={setRow} entityOptions={(entities?.items ?? []).map((e) => e.name)} />
        {duplicate && (
          <InlineNotification
            kind="warning"
            lowContrast
            hideCloseButton
            title={`${entity.label} already has a field named ${row.name}.`}
          />
        )}
        {!!updateEntity.error && <ErrorAlert error={updateEntity.error} />}
      </ModalBody>
      <ModalFooter>
        <Button kind="tertiary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          kind="primary"
          disabled={!row.name.trim() || duplicate || (row.type === "reference" && !row.reference) || updateEntity.isPending}
          onClick={() =>
            updateEntity.mutate(
              { entityName: entity.name, fields: [...entity.fields, toField(row)] },
              {
                onSuccess: () => {
                  setRow(emptyRow());
                  onClose();
                },
              },
            )
          }
        >
          Add field
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}
