import { useState } from "react";
import { InlineNotification, Modal, Stack } from "@carbon/react";
import { useListEntities, useUpdateEntity } from "@workspacenow/api-client";
import type { Entity } from "@workspacenow/types";
import { ErrorAlert } from "./RecordForm";
import { FieldRowEditor, emptyRow, toField, type FieldRow } from "./NewEntityDialog";

import common from "../common.module.scss";

export function AddFieldDialog({ entity, open, onClose }: { entity: Entity; open: boolean; onClose: () => void }) {
  const updateEntity = useUpdateEntity();
  const { data: entities } = useListEntities();
  const [row, setRow] = useState<FieldRow>(emptyRow);
  const duplicate = entity.fields.some((f) => f.name === row.name.trim());

  return (
    <Modal
      open={open}
      size="lg"
      modalLabel={entity.label}
      modalHeading={`Add field to ${entity.label}`}
      primaryButtonText="Add field"
      secondaryButtonText="Cancel"
      primaryButtonDisabled={!row.name.trim() || duplicate || (row.type === "reference" && !row.reference) || updateEntity.isPending}
      onRequestClose={onClose}
      onRequestSubmit={() =>
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
      <Stack gap={5}>
        <p className={common.helper}>Adding a field publishes a new version of the entity definition.</p>
        <FieldRowEditor row={row} onChange={setRow} entityOptions={(entities?.items ?? []).map((e) => e.name)} />
        {duplicate && <InlineNotification kind="warning" lowContrast hideCloseButton title={`${entity.label} already has a field named ${row.name}.`} />}
        {!!updateEntity.error && <ErrorAlert error={updateEntity.error} />}
      </Stack>
    </Modal>
  );
}
