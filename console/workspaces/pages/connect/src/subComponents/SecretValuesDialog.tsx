import { Button, Modal } from "@carbon/react";
import { useReadSecret } from "@workspacenow/api-client";
import { errorMessage } from "@workspacenow/views";

/** Shows one OpenBao secret's values to a control.manage user; the platform never stores or logs them. */
export function SecretValuesDialog({ path, onClose }: { path: string; onClose: () => void }) {
  const read = useReadSecret();
  return (
    <Modal
      open
      size="md"
      modalHeading={<span className="break-all font-mono text-sm">{path}</span>}
      onRequestClose={onClose}
      secondaryButtonText="Close"
      onSecondarySubmit={onClose}
    >
      {read.isIdle && !read.data ? (
        <Button disabled={read.isPending} onClick={() => read.mutate(path)}>
          Reveal values
        </Button>
      ) : read.error ? (
        <p className="text-sm text-danger">{errorMessage(read.error)}</p>
      ) : (
        read.data && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
            {Object.entries(read.data.values).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-mono text-xs text-muted">{k}</dt>
                <dd className="break-all font-mono text-xs">{v}</dd>
              </div>
            ))}
          </dl>
        )
      )}
    </Modal>
  );
}
