import { useState } from "react";
import { InlineNotification, Modal, Stack } from "@carbon/react";
import { useInvokeBusinessOperation } from "@workspacenow/api-client";
import type { EntityRecord } from "@workspacenow/types";
import { TextInput, errorMessage } from "@workspacenow/views";
import shared from "../shared.module.scss";

/** Records a sale through the inventory.recordSale Business Operation, which may raise a low-stock event. */
export function SaleDialog({ stock, label, onClose }: { stock: EntityRecord; label: string; onClose: () => void }) {
  const [quantity, setQuantity] = useState("1");
  const recordSale = useInvokeBusinessOperation({ successMessage: "Sale recorded" });
  const after = Number(stock.values.quantity) - Number(quantity || 0);
  const crosses = Number(stock.values.quantity) > Number(stock.values.reorderLevel) && after <= Number(stock.values.reorderLevel);

  return (
    <Modal
      open
      size="sm"
      modalHeading="Record a sale"
      onRequestClose={onClose}
      secondaryButtonText="Cancel"
      onSecondarySubmit={onClose}
      primaryButtonText="Record sale"
      primaryButtonDisabled={!(Number(quantity) > 0) || recordSale.isPending}
      loadingStatus={recordSale.isPending ? "active" : "inactive"}
      loadingDescription="Recording"
      onRequestSubmit={() =>
        recordSale.mutate(
          { operation: "inventory.recordSale", input: { stockId: stock.id, quantity: Number(quantity) }, entryPoint: "studio" },
          { onSuccess: onClose },
        )
      }
    >
      <Stack gap={5}>
        <p className={shared.body}>
          {label} at {String(stock.values.store)}: <strong className={shared.numeric}>{String(stock.values.quantity)}</strong> on
          hand, reorder level <strong className={shared.numeric}>{String(stock.values.reorderLevel)}</strong>.
        </p>
        <TextInput label="Units sold" type="number" required value={quantity} onChange={setQuantity} />
        {crosses && (
          <InlineNotification kind="warning" lowContrast hideCloseButton title="This sale crosses the reorder level. Inventory Management will publish Stock.LowStockReached and start the low-stock replenishment workflow." />
        )}
        {!!recordSale.error && (
          <InlineNotification kind="error" lowContrast hideCloseButton title={errorMessage(recordSale.error)} />
        )}
      </Stack>
    </Modal>
  );
}
