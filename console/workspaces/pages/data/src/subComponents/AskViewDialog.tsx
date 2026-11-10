import { useState } from "react";
import { InlineNotification, Modal, Stack } from "@carbon/react";

import { useCreateViewFromText } from "@workspacenow/api-client";
import type { Entity, SavedView } from "@workspacenow/types";
import { TextInput } from "@workspacenow/views";

export function AskViewDialog({ entity, onClose, onCreated }: { entity: Entity; onClose: () => void; onCreated?: (view: SavedView) => void }) {
  const [text, setText] = useState("");
  const [explanation, setExplanation] = useState<string>();
  const ask = useCreateViewFromText();
  const askErr = ask.error as Error | null;

  return (
    <Modal
      open
      size="md"
      modalLabel={entity.label}
      modalHeading={`Ask for a view of ${entity.label}`}
      primaryButtonText="Build view"
      secondaryButtonText="Close"
      primaryButtonDisabled={ask.isPending || !text.trim() || !!explanation}
      onRequestClose={onClose}
      onRequestSubmit={() =>
        ask.mutate(
          { entityName: entity.name, text },
          {
            onSuccess: (res) => {
              setExplanation(res.explanation);
              onCreated?.(res.view);
            },
          },
        )
      }
    >
      <Stack gap={5}>
        <TextInput
          label="Describe the records you want"
          value={text}
          onChange={setText}
          multiline
          rows={2}
          placeholder='e.g. "unitPrice below 1000 ordered by name desc, limit 20"'
        />
        {askErr && <InlineNotification kind="error" lowContrast hideCloseButton title="Could not build a view" subtitle={askErr.message} />}
        {explanation && <InlineNotification kind="success" lowContrast hideCloseButton title="View created" subtitle={explanation} />}
      </Stack>
    </Modal>
  );
}
