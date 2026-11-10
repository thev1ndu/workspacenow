import { useEffect, useState } from "react";
import { Modal } from "@carbon/react";
import { ArrowDownToLine } from "@workspacenow/icons";
import QRCode from "qrcode";

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
      <div className="grid justify-items-center gap-3 pb-2">
        {failed ? (
          <p className="text-sm text-danger">The QR code could not be drawn.</p>
        ) : image ? (
          <img src={image} alt={`QR code for ${code}`} className="size-60 rounded-xl" />
        ) : (
          <div className="size-60 animate-pulse rounded-xl bg-default" />
        )}
        <p className="font-mono text-sm">{code}</p>
        {image && (
          <a href={image} download={`${code}.png`} className="inline-flex items-center gap-1.5 text-sm text-accent no-underline hover:underline">
            <ArrowDownToLine className="size-4" aria-hidden />
            Save image
          </a>
        )}
      </div>
    </Modal>
  );
}
