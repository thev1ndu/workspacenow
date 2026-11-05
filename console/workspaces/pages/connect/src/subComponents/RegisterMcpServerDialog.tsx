import { useState } from "react";
import { Button, Modal } from "@heroui/react";
import { useRegisterMcpServer } from "@workspacenow/api-client";
import type { McpServer } from "@workspacenow/types";
import { SelectInput, TextInput } from "@workspacenow/views";

export function RegisterMcpServerDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("https://");
  const [auth, setAuth] = useState<McpServer["auth"]>("oauth2");
  const register = useRegisterMcpServer();

  const nameError = name.trim() ? undefined : "Name is required";
  const urlError = /^https?:\/\/.+/.test(url) ? undefined : "Enter an http(s) URL";

  return (
    <Modal.Backdrop isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Container size="md">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>Register MCP server</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="grid gap-4">
            <TextInput label="Name" required value={name} onChange={setName} placeholder="Weather service" />
            <TextInput label="Server URL" required value={url} onChange={setUrl} error={url.length > 8 ? urlError : undefined} />
            <SelectInput
              label="Authentication"
              required
              value={auth}
              onChange={(v) => setAuth(v as McpServer["auth"])}
              options={[
                { value: "oauth2", label: "OAuth 2.0" },
                { value: "api-key", label: "API key (stored in secrets manager)" },
                { value: "none", label: "None" },
              ]}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={onClose}>
              Cancel
            </Button>
            <Button
              isDisabled={!!nameError || !!urlError}
              isPending={register.isPending}
              onPress={() => register.mutate({ name: name.trim(), url: url.trim(), auth }, { onSuccess: onClose })}
            >
              Register and discover tools
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
