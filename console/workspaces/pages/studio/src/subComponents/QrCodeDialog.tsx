import { Download } from "@carbon/react/icons";
import { useEffect, useState } from "react";
import { CodeSnippet, InlineNotification, Link, Modal, SkeletonPlaceholder } from "@carbon/react";

import QRCode from "qrcode";

import styles from "./QrCodeDialog.module.scss";

/** A record's QR code, as a scan page reads it, ready to show on screen or save and print. */
export function QrCodeDialog({ title, code, onClose }: { title: string; code: string; onClose: () => void }) {
  const [image, setImage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let current = true;
    // Dark modules on white whatever the theme: scanners need the contrast.
    QRCode.toDataURL(code, { width: 512, margin: 2, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } })
      .then((url) => current && setImage(url))
      .catch(() => current && setFailed(true));
    return () => {
      current = false;
    };
  }, [code]);

  return (
    <Modal open passiveModal size="sm" modalHeading={title} onRequestClose={onClose}>
      <div className={styles.content}>
        {failed ? (
          <InlineNotification kind="error" lowContrast hideCloseButton title="The QR code could not be drawn." />
        ) : image ? (
          <img src={image} alt={`QR code for ${code}`} className={styles.qr} />
        ) : (
          <SkeletonPlaceholder className={styles.qr} />
        )}
        <CodeSnippet type="inline" hideCopyButton>
          {code}
        </CodeSnippet>
        {image && (
          <Link href={image} download={`${code}.png`} renderIcon={Download}>
            Save image
          </Link>
        )}
      </div>
    </Modal>
  );
}
