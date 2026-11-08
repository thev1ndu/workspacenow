import { useState } from "react";
import { Alert, Button, ListBox, Modal, Select, Table } from "@heroui/react";
import { useNavigate } from "react-router-dom";
import { useCreateEntity, useInferEntity } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import type { EntityField, InferEntityInput } from "@workspacenow/types";
import { TextInput } from "@workspacenow/views";

export function InferEntityDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [format, setFormat] = useState<"json" | "csv">("csv");
  const [data, setData] = useState("");
  const infer = useInferEntity();
  const create = useCreateEntity();
  const inferred = infer.data;
  const inferErr = infer.error as Error | null;

  return (
    <Modal.Backdrop isOpen onOpenChange={(o) => !o && onClose()}>
      <Modal.Container size="lg">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>New entity from data</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <TextInput label="Entity name (optional)" value={name} onChange={setName} placeholder="Product" />
                <Select
                  aria-label="Data format"
                  className="w-full"
                  selectedKey={format}
                  onChange={(k) => setFormat(String(k) as "json" | "csv")}
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item key="csv" id="csv" textValue="CSV">CSV (first row = headers)<ListBox.ItemIndicator /></ListBox.Item>
                      <ListBox.Item key="json" id="json" textValue="JSON">JSON array of objects<ListBox.ItemIndicator /></ListBox.Item>
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
              <TextInput
                label="Paste sample data"
                value={data}
                onChange={setData}
                multiline
                rows={6}
                placeholder={format === "csv" ? "sku,name,price\nSKU-1,Widget,9.99" : '[{"sku":"SKU-1","name":"Widget","price":9.99}]'}
              />
              {inferErr && <Alert color="danger"><Alert.Indicator /><Alert.Content><Alert.Title>Could not infer a schema</Alert.Title><Alert.Description>{inferErr.message}</Alert.Description></Alert.Content></Alert>}
              {inferred && (
                <>
                  <Alert color="success"><Alert.Indicator /><Alert.Content><Alert.Title>{`Proposed ${inferred.name} from ${inferred.rows} rows`}</Alert.Title><Alert.Description>{`${inferred.fields.length} fields inferred`}</Alert.Description></Alert.Content></Alert>
                  <Table variant="secondary">
                    <Table.ScrollContainer>
                      <Table.Content aria-label="Inferred fields">
                        <Table.Header>
                          <Table.Column isRowHeader>Field</Table.Column>
                          <Table.Column>Type</Table.Column>
                          <Table.Column>Required</Table.Column>
                          <Table.Column>Unique</Table.Column>
                        </Table.Header>
                        <Table.Body>
                          {inferred.fields.map((f) => (
                            <Table.Row key={f.name} id={f.name}>
                              <Table.Cell className="font-mono text-xs">{f.name}</Table.Cell>
                              <Table.Cell>{f.type}{f.enumValues ? ` (${f.enumValues.join(", ")})` : ""}</Table.Cell>
                              <Table.Cell>{f.required ? "yes" : "no"}</Table.Cell>
                              <Table.Cell>{f.unique ? "yes" : "no"}</Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Content>
                    </Table.ScrollContainer>
                  </Table>
                </>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={onClose}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              isPending={infer.isPending}
              isDisabled={!data.trim() || !!inferred}
              onPress={() => infer.mutate({ name: name || undefined, format, data } as InferEntityInput)}
            >
              Infer schema
            </Button>
            <Button
              variant="primary"
              isPending={create.isPending}
              isDisabled={!inferred}
              onPress={() =>
                create.mutate(
                  {
                    name: inferred!.name,
                    label: inferred!.name,
                    description: `Inferred from ${inferred!.rows} sample rows`,
                    scope: "organization",
                    fields: inferred!.fields.map((f) => ({ name: f.name, label: f.label, type: f.type, required: f.required, unique: f.unique, enumValues: f.enumValues }) as EntityField),
                  },
                  { onSuccess: (e) => navigate(buildPath(routes.data.entity, { entityName: e.name })) },
                )
              }
            >
              Create entity
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
