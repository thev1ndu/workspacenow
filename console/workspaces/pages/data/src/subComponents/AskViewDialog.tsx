import { useState } from "react";
import { Alert, Button, Modal } from "@heroui/react";
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
    <Modal.Backdrop isOpen onOpenChange={(o) => !o && onClose()}>
      <Modal.Container size="md">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>Ask for a view of {entity.label}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <TextInput
              label="Describe the records you want"
              value={text}
              onChange={setText}
              multiline
              rows={2}
              placeholder='e.g. "unitPrice below 1000 ordered by name desc, limit 20"'
            />
            {askErr && <Alert color="danger"><Alert.Indicator /><Alert.Content><Alert.Title>Could not build a view</Alert.Title><Alert.Description>{askErr.message}</Alert.Description></Alert.Content></Alert>}
            {explanation && <Alert color="success"><Alert.Indicator /><Alert.Content><Alert.Title>View created</Alert.Title><Alert.Description>{explanation}</Alert.Description></Alert.Content></Alert>}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              isPending={ask.isPending}
              isDisabled={!text.trim() || !!explanation}
              onPress={() =>
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
              <Sparkles className="size-4" aria-hidden />
              Build view
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
