import { useId, useState } from "react";
import {
  Button,
  ComposedModal,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { useNavigate } from "react-router-dom";
import { useCreateEntity, useInferEntity } from "@workspacenow/api-client";
import { buildPath, routes } from "@workspacenow/types";
import type { EntityField, InferEntityInput } from "@workspacenow/types";
import { TextInput } from "@workspacenow/views";

export function InferEntityDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const formatId = useId();
  const [name, setName] = useState("");
  const [format, setFormat] = useState<"json" | "csv">("csv");
  const [data, setData] = useState("");
  const infer = useInferEntity();
  const create = useCreateEntity();
  const inferred = infer.data;
  const inferErr = infer.error as Error | null;

  return (
    <ComposedModal open onClose={onClose} size="lg">
      <ModalHeader title="New entity from data" closeModal={onClose} />
      <ModalBody>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Entity name (optional)" value={name} onChange={setName} placeholder="Product" />
            <Select
              id={formatId}
              labelText="Data format"
              hideLabel
              aria-label="Data format"
              className="w-full"
              value={format}
              onChange={(e) => setFormat(e.target.value as "json" | "csv")}
            >
              <SelectItem value="csv" text="CSV (first row = headers)" />
              <SelectItem value="json" text="JSON array of objects" />
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
          {inferErr && (
            <InlineNotification kind="error" lowContrast hideCloseButton title="Could not infer a schema" subtitle={inferErr.message} />
          )}
          {inferred && (
            <>
              <InlineNotification
                kind="success"
                lowContrast
                hideCloseButton
                title={`Proposed ${inferred.name} from ${inferred.rows} rows`}
                subtitle={`${inferred.fields.length} fields inferred`}
              />
              <TableContainer aria-label="Inferred fields">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Field</TableHeader>
                      <TableHeader>Type</TableHeader>
                      <TableHeader>Required</TableHeader>
                      <TableHeader>Unique</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {inferred.fields.map((f) => (
                      <TableRow key={f.name} id={f.name}>
                        <TableCell className="font-mono text-xs">{f.name}</TableCell>
                        <TableCell>{f.type}{f.enumValues ? ` (${f.enumValues.join(", ")})` : ""}</TableCell>
                        <TableCell>{f.required ? "yes" : "no"}</TableCell>
                        <TableCell>{f.unique ? "yes" : "no"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="tertiary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          kind="secondary"
          disabled={infer.isPending || !data.trim() || !!inferred}
          onClick={() => infer.mutate({ name: name || undefined, format, data } as InferEntityInput)}
        >
          Infer schema
        </Button>
        <Button
          kind="primary"
          disabled={create.isPending || !inferred}
          onClick={() =>
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
      </ModalFooter>
    </ComposedModal>
  );
}
