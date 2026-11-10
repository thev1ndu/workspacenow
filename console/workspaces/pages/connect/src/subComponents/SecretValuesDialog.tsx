import { Button, CodeSnippet, Modal, StructuredListBody, StructuredListCell, StructuredListHead, StructuredListRow, StructuredListWrapper } from "@carbon/react";
import { useReadSecret } from "@workspacenow/api-client";
import { errorMessage } from "@workspacenow/views";

import common from "../common.module.scss";

/** Shows one OpenBao secret's values to a control.manage user; the platform never stores or logs them. */
export function SecretValuesDialog({ path, onClose }: { path: string; onClose: () => void }) {
  const read = useReadSecret();
  return (
    <Modal
      open
      size="md"
      modalLabel="OpenBao secret"
      modalHeading={path}
      onRequestClose={onClose}
      passiveModal={false}
      secondaryButtonText="Close"
      onSecondarySubmit={onClose}
    >
      {read.isIdle && !read.data ? (
        <Button disabled={read.isPending} onClick={() => read.mutate(path)}>
          Reveal values
        </Button>
      ) : read.error ? (
        <p className={common.error}>{errorMessage(read.error)}</p>
      ) : (
        read.data && (
          <StructuredListWrapper isCondensed aria-label="Secret values">
            <StructuredListHead>
              <StructuredListRow head>
                <StructuredListCell head>Key</StructuredListCell>
                <StructuredListCell head>Value</StructuredListCell>
              </StructuredListRow>
            </StructuredListHead>
            <StructuredListBody>
              {Object.entries(read.data.values).map(([k, v]) => (
                <StructuredListRow key={k}>
                  <StructuredListCell>
                    <CodeSnippet type="inline" feedback="Copied">
                      {k}
                    </CodeSnippet>
                  </StructuredListCell>
                  <StructuredListCell>
                    <CodeSnippet type="inline" feedback="Copied">
                      {v}
                    </CodeSnippet>
                  </StructuredListCell>
                </StructuredListRow>
              ))}
            </StructuredListBody>
          </StructuredListWrapper>
        )
      )}
    </Modal>
  );
}
