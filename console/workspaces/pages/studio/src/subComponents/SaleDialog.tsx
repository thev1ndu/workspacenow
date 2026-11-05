import { useState } from "react";
import { Alert, Button, Modal } from "@heroui/react";
import { useInvokeBusinessOperation } from "@workspacenow/api-client";
import type { EntityRecord } from "@workspacenow/types";
import { TextInput, errorMessage } from "@workspacenow/views";

/** Records a sale through the inventory.recordSale Business Operation, which may raise a low-stock event. */
export function SaleDialog({ stock, label, onClose }: { stock: EntityRecord; label: string; onClose: () => void }) {
  const [quantity, setQuantity] = useState("1");
  const recordSale = useInvokeBusinessOperation({ successMessage: "Sale recorded" });
  const after = Number(stock.values.quantity) - Number(quantity || 0);
  const crosses = Number(stock.values.quantity) > Number(stock.values.reorderLevel) && after <= Number(stock.values.reorderLevel);

  return (
    <Modal.Backdrop isOpen onOpenChange={(next) => !next && onClose()}>
      <Modal.Container size="sm">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>Record a sale</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="grid gap-4">
            <p className="text-sm text-muted">
              {label} at {String(stock.values.store)}: <span className="tabular-nums text-foreground">{String(stock.values.quantity)}</span> on
              hand, reorder level <span className="tabular-nums text-foreground">{String(stock.values.reorderLevel)}</span>.
            </p>
            <TextInput label="Units sold" type="number" required value={quantity} onChange={setQuantity} />
            {crosses && (
              <Alert status="warning">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>
                    This sale crosses the reorder level. Inventory Management will publish Stock.LowStockReached and start the low-stock
                    replenishment workflow.
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            )}
            {!!recordSale.error && (
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{errorMessage(recordSale.error)}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={onClose}>
              Cancel
            </Button>
            <Button
              isDisabled={!(Number(quantity) > 0)}
              isPending={recordSale.isPending}
              onPress={() =>
                recordSale.mutate(
                  { operation: "inventory.recordSale", input: { stockId: stock.id, quantity: Number(quantity) }, entryPoint: "studio" },
                  { onSuccess: onClose },
                )
              }
            >
              Record sale
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
