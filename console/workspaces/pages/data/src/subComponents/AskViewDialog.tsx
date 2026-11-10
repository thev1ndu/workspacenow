import { useState } from "react";
import { Button, ComposedModal, InlineNotification, ModalBody, ModalFooter, ModalHeader } from "@carbon/react";
import { Sparkles } from "@workspacenow/icons";
import { useCreateViewFromText } from "@workspacenow/api-client";
import type { Entity, SavedView } from "@workspacenow/types";
import { TextInput } from "@workspacenow/views";

export function AskViewDialog({ entity, onClose, onCreated }: { entity: Entity; onClose: () => void; onCreated?: (view: SavedView) => void }) {
  const [text, setText] = useState("");
  const [explanation, setExplanation] = useState<string>();
  const ask = useCreateViewFromText();
  const askErr = ask.error as Error | null;

  return (
    <ComposedModal open onClose={onClose} size="md">
      <ModalHeader title={`Ask for a view of ${entity.label}`} closeModal={onClose} />
      <ModalBody>
        <TextInput
          label="Describe the records you want"
          value={text}
          onChange={setText}
          multiline
          rows={2}
          placeholder='e.g. "unitPrice below 1000 ordered by name desc, limit 20"'
        />
        {askErr && (
          <InlineNotification kind="error" lowContrast hideCloseButton title="Could not build a view" subtitle={askErr.message} />
        )}
        {explanation && (
          <InlineNotification kind="success" lowContrast hideCloseButton title="View created" subtitle={explanation} />
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="tertiary" onClick={onClose}>
          Close
        </Button>
        <Button
          kind="primary"
          disabled={ask.isPending || !text.trim() || !!explanation}
          onClick={() =>
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
          renderIcon={(p) => <Sparkles className="size-4" aria-hidden {...p} />}
        >
          Build view
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}
