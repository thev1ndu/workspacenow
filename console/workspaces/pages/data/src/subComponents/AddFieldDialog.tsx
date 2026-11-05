import { useState } from "react";
import { Alert, Button, Modal } from "@heroui/react";
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
    <Modal.Backdrop isOpen={open} onOpenChange={(next) => !next && onClose()}>
      <Modal.Container size="lg" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>Add field to {entity.label}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="grid gap-4">
            <p className="text-sm text-muted">Adding a field publishes a new version of the entity definition.</p>
            <FieldRowEditor row={row} onChange={setRow} entityOptions={(entities?.items ?? []).map((e) => e.name)} />
            {duplicate && (
              <Alert status="warning">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>
                    {entity.label} already has a field named {row.name}.
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            )}
            {!!updateEntity.error && <ErrorAlert error={updateEntity.error} />}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={onClose}>
              Cancel
            </Button>
            <Button
              isDisabled={!row.name.trim() || duplicate || (row.type === "reference" && !row.reference)}
              isPending={updateEntity.isPending}
              onPress={() =>
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
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
