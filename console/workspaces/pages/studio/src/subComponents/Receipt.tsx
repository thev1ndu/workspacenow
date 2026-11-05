import type { CSSProperties } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { EntityRecord } from "@workspacenow/types";
import { globalConfig } from "@workspacenow/types";
import { formatDateTime } from "@workspacenow/views";

export interface ReceiptLine {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

const amount = (value: unknown) => new Intl.NumberFormat("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));

// Inline styles only: the same markup is printed from a bare frame with no app stylesheet.
const paper: CSSProperties = { width: "72mm", padding: "4mm", background: "#fff", color: "#000", font: "12px/1.45 ui-monospace, Menlo, Consolas, monospace" };
const row: CSSProperties = { display: "flex", justifyContent: "space-between", gap: "8px" };
const rule: CSSProperties = { borderTop: "1px dashed #000", margin: "6px 0" };
const centre: CSSProperties = { textAlign: "center" };

/** A till receipt sized for 80 mm thermal paper; shown on screen as-is and printed by printReceipt. */
export function Receipt({ sale, lines }: { sale: EntityRecord; lines: ReceiptLine[] }) {
  const v = sale.values;
  return (
    <div style={paper}>
      <div style={{ ...centre, fontWeight: 700, fontSize: "14px" }}>{globalConfig.organizationName}</div>
      <div style={centre}>{String(v.store)}</div>
      <div style={rule} />
      <div style={row}>
        <span>Receipt</span>
        <span>{String(v.receipt)}</span>
      </div>
      <div style={row}>
        <span>Date</span>
        <span>{formatDateTime(sale.createdAt)}</span>
      </div>
      <div style={row}>
        <span>Cashier</span>
        <span>{sale.createdBy}</span>
      </div>
      <div style={rule} />
      {lines.map((line) => (
        <div key={line.productId} style={{ marginBottom: "4px" }}>
          <div>{line.name}</div>
          <div style={row}>
            <span>
              {line.quantity} × {amount(line.unitPrice)}
            </span>
            <span>{amount(line.lineTotal)}</span>
          </div>
        </div>
      ))}
      <div style={rule} />
      <div style={{ ...row, fontWeight: 700, fontSize: "14px" }}>
        <span>TOTAL LKR</span>
        <span>{amount(v.total)}</span>
      </div>
      <div style={row}>
        <span>{v.paymentMethod === "card" ? "Card" : "Cash"}</span>
        <span>{amount(v.tendered)}</span>
      </div>
      {v.paymentMethod === "cash" && (
        <div style={row}>
          <span>Change</span>
          <span>{amount(v.change)}</span>
        </div>
      )}
      <div style={rule} />
      <div style={centre}>
        {String(v.itemCount)} item{Number(v.itemCount) === 1 ? "" : "s"} / Thank you!
      </div>
    </div>
  );
}

/** Prints the receipt alone, from a hidden frame, so the page around it never reaches the printer. */
export function printReceipt(sale: EntityRecord, lines: ReceiptLine[]): void {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${String(sale.values.receipt)}</title><style>@page{size:80mm auto;margin:0}body{margin:0}</style></head><body>${renderToStaticMarkup(<Receipt sale={sale} lines={lines} />)}</body></html>`,
  );
  doc.close();
  const win = frame.contentWindow!;
  const cleanup = () => frame.remove();
  win.addEventListener("afterprint", cleanup, { once: true });
  // Some browsers never fire afterprint for a frame; don't leave it behind.
  setTimeout(cleanup, 60_000);
  win.focus();
  win.print();
}
