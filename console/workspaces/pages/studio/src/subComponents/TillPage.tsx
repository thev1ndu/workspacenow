import { Subtract, Add, TrashCan } from "@carbon/react/icons";
import { useState } from "react";
import { Button, ClickableTile, Column, ContentSwitcher, Grid, InlineNotification, Modal, Stack, Switch, Tag } from "@carbon/react";

import { useInvokeBusinessOperation, useListRecords } from "@workspacenow/api-client";
import type { EntityRecord, OperationResult } from "@workspacenow/types";
import { NoDataFound, QueryState, SectionCard, SelectInput, TextInput, errorMessage, formatCurrency, CardGridSkeleton } from "@workspacenow/views";
import { Receipt, printReceipt, type ReceiptLine } from "./Receipt";

import styles from "./TillPage.module.scss";

const STORE_KEY = "workspacenow-till-store";
const STORES = ["Colombo City", "Kandy", "Galle"];

function readStore(): string {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    return saved && STORES.includes(saved) ? saved : STORES[0];
  } catch {
    return STORES[0];
  }
}

function writeStore(store: string): void {
  try {
    localStorage.setItem(STORE_KEY, store);
  } catch {
    // The till still uses the store for this visit.
  }
}

interface CheckoutResult {
  sale: EntityRecord;
  lines: ReceiptLine[];
  lowStock: string[];
}

/** Round cash amounts a customer is likely to hand over for this total. */
function quickCash(total: number): number[] {
  return [...new Set([total, Math.ceil(total / 1000) * 1000, Math.ceil(total / 5000) * 5000])].filter((v) => v > 0).slice(0, 3);
}

function ReceiptDialog({ result, onClose }: { result: CheckoutResult; onClose: () => void }) {
  return (
    <Modal
      open
      size="sm"
      hasScrollingContent
      modalHeading="Sale complete"
      onRequestClose={onClose}
      secondaryButtonText="New sale"
      onSecondarySubmit={onClose}
      primaryButtonText="Print receipt"
      onRequestSubmit={() => printReceipt(result.sale, result.lines)}
    >
      <Stack gap={5}>
        {result.lowStock.length > 0 && (
          <InlineNotification
            kind="warning"
            lowContrast
            hideCloseButton
            title={`${result.lowStock.join(", ")} reached the reorder level; the low-stock replenishment workflow has started.`}
          />
        )}
        <div className={styles.paper}>
          <div className={styles.receipt}>
            <Receipt sale={result.sale} lines={result.lines} />
          </div>
        </div>
      </Stack>
    </Modal>
  );
}

/**
 * The store till: pick products into a cart, take cash or card, and check out through
 * inventory.checkout, which sells every line or none and returns a printable receipt.
 */
export function TillPage() {
  const products = useListRecords({ entityName: "Product" });
  const stock = useListRecords({ entityName: "Stock" });
  const checkout = useInvokeBusinessOperation({ successMessage: "Sale recorded" });
  const [store, setStore] = useState(readStore);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState<"cash" | "card">("cash");
  const [tendered, setTendered] = useState("");
  const [result, setResult] = useState<CheckoutResult | null>(null);

  const onHand = (productId: string) => {
    const row = stock.data?.items.find((s) => s.values.product === productId && s.values.store === store);
    return row ? Number(row.values.quantity) : undefined;
  };
  const price = (p: EntityRecord) => Number(p.values.unitPrice);
  const lines = Object.entries(cart)
    .map(([id, quantity]) => ({ product: products.data?.items.find((p) => p.id === id), quantity }))
    .filter((l): l is { product: EntityRecord; quantity: number } => !!l.product);
  const total = lines.reduce((sum, l) => sum + price(l.product) * l.quantity, 0);
  const cash = Number(tendered);
  const change = method === "cash" && tendered !== "" ? cash - total : 0;
  const canCharge = lines.length > 0 && (method === "card" || (tendered !== "" && cash >= total));

  // Takes a function of the current quantity so quick repeated taps each count.
  const setQuantity = (id: string, quantity: number | ((current: number) => number)) =>
    setCart((c) => {
      const next = { ...c };
      const wanted = typeof quantity === "function" ? quantity(c[id] ?? 0) : quantity;
      if (wanted <= 0) delete next[id];
      else next[id] = Math.min(wanted, onHand(id) ?? 0);
      return next;
    });
  const changeStore = (next: string) => {
    // Stock differs per store, so a cart started at one till does not carry over.
    setStore(next);
    writeStore(next);
    setCart({});
  };
  const reset = () => {
    setCart({});
    setTendered("");
    setMethod("cash");
    setResult(null);
    checkout.reset();
  };
  const charge = () =>
    checkout.mutate(
      {
        operation: "inventory.checkout",
        input: { store, lines: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })), paymentMethod: method, tendered: method === "cash" ? cash : undefined },
        entryPoint: "studio",
      },
      { onSuccess: (response) => setResult((response as OperationResult<CheckoutResult>).output) },
    );

  const term = search.trim().toLowerCase();

  return (
    <>
      <Grid narrow withRowGap>
        <Column sm={4} md={8} lg={10}>
          <SectionCard
            title="Products"
            subtitle="Tap a product to add it to the cart"
            actions={
              <div className={styles.store}>
                <SelectInput label="Store" value={store} onChange={changeStore} options={STORES.map((s) => ({ value: s, label: s }))} />
              </div>
            }
          >
            <Stack gap={5}>
              <TextInput label="Search" value={search} onChange={setSearch} placeholder="Name or SKU" />
              <QueryState query={products} skeleton={<CardGridSkeleton count={6} columns={3} />}>
                {(data) => {
                  const shown = data.items.filter((p) => !term || String(p.values.name).toLowerCase().includes(term) || String(p.values.sku).toLowerCase().includes(term));
                  if (shown.length === 0) return <NoDataFound message="No products match." />;
                  return (
                    <div className={styles.products}>
                      {shown.map((p) => {
                        const available = onHand(p.id);
                        const inCart = cart[p.id] ?? 0;
                        const left = (available ?? 0) - inCart;
                        return (
                          <ClickableTile
                            key={p.id}
                            role="button"
                            aria-disabled={left <= 0}
                            disabled={left <= 0}
                            onClick={() => setQuantity(p.id, (current) => current + 1)}
                            className={styles.product}
                          >
                            {inCart > 0 && (
                              <Tag size="sm" type="blue" className={styles.badge}>
                                {inCart}
                              </Tag>
                            )}
                            <span className={styles.productName}>{String(p.values.name)}</span>
                            <span className={styles.sku}>{String(p.values.sku)}</span>
                            <span className={styles.price}>{formatCurrency(price(p))}</span>
                            <span className={styles.stock}>
                              {available === undefined ? "Not stocked at this store" : left <= 0 ? "No more in stock" : `${left} in stock`}
                            </span>
                          </ClickableTile>
                        );
                      })}
                    </div>
                  );
                }}
              </QueryState>
            </Stack>
          </SectionCard>
        </Column>

        <Column sm={4} md={8} lg={6}>
          <SectionCard title="Cart" subtitle={store} flush>
            {lines.length === 0 ? (
              <p className={styles.empty}>The cart is empty.</p>
            ) : (
              <ul className={styles.lines}>
                {lines.map(({ product, quantity }) => (
                  <li key={product.id} className={styles.line}>
                    <div>
                      <p className={styles.lineName}>{String(product.values.name)}</p>
                      <p className={styles.lineEach}>{formatCurrency(price(product))} each</p>
                    </div>
                    <p className={styles.lineTotal}>{formatCurrency(price(product) * quantity)}</p>
                    <div className={styles.stepper}>
                      <Button
                        hasIconOnly
                        renderIcon={Subtract}
                        iconDescription={`One fewer ${String(product.values.name)}`}
                        size="sm"
                        kind="secondary"
                        aria-label={`One fewer ${String(product.values.name)}`}
                        onClick={() => setQuantity(product.id, (current) => current - 1)}
                      />
                      <span className={styles.qty} aria-label="Quantity">
                        {quantity}
                      </span>
                      <Button
                        hasIconOnly
                        renderIcon={Add}
                        iconDescription={`One more ${String(product.values.name)}`}
                        size="sm"
                        kind="secondary"
                        aria-label={`One more ${String(product.values.name)}`}
                        disabled={quantity >= (onHand(product.id) ?? 0)}
                        onClick={() => setQuantity(product.id, (current) => current + 1)}
                      />
                      <Button
                        hasIconOnly
                        renderIcon={TrashCan}
                        iconDescription={`Remove ${String(product.values.name)}`}
                        size="sm"
                        kind="ghost"
                        className={styles.remove}
                        aria-label={`Remove ${String(product.values.name)}`}
                        onClick={() => setQuantity(product.id, 0)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className={styles.checkout}>
              <Stack gap={5}>
                <div className={styles.total}>
                  <span className={styles.totalLabel}>Total</span>
                  <span className={styles.totalValue}>{formatCurrency(total)}</span>
                </div>
                <ContentSwitcher
                  size="md"
                  selectedIndex={method === "cash" ? 0 : 1}
                  onChange={({ name }) => setMethod(name === "card" ? "card" : "cash")}
                >
                  <Switch name="cash" text="Cash" />
                  <Switch name="card" text="Card" />
                </ContentSwitcher>
                {method === "cash" && (
                  <Stack gap={3}>
                    <TextInput label="Cash tendered (LKR)" type="number" value={tendered} onChange={setTendered} />
                    {total > 0 && (
                      <div className={styles.quickCash}>
                        {quickCash(total).map((v) => (
                          <Button key={v} size="sm" kind="tertiary" onClick={() => setTendered(String(v))}>
                            {v === total ? "Exact" : formatCurrency(v)}
                          </Button>
                        ))}
                      </div>
                    )}
                    {tendered !== "" && (
                      <p className={`${styles.change} ${change < 0 ? styles.short : ""}`}>
                        {change < 0 ? `${formatCurrency(-change)} short` : `Change ${formatCurrency(change)}`}
                      </p>
                    )}
                  </Stack>
                )}
                {!!checkout.error && (
                  <InlineNotification kind="error" lowContrast hideCloseButton title={errorMessage(checkout.error)} />
                )}
                <Button size="lg" className={styles.charge} disabled={!canCharge || checkout.isPending} onClick={charge}>
                  Charge {formatCurrency(total)}
                </Button>
              </Stack>
            </div>
          </SectionCard>
        </Column>
      </Grid>
      {result && <ReceiptDialog result={result} onClose={reset} />}
    </>
  );
}
