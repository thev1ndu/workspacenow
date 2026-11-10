import { useState } from "react";
import { Button, InlineNotification, Modal } from "@carbon/react";
import { Minus, Plus, Printer, TrashBin } from "@workspacenow/icons";
import { useInvokeBusinessOperation, useListRecords } from "@workspacenow/api-client";
import type { EntityRecord, OperationResult } from "@workspacenow/types";
import { NoDataFound, QueryState, SectionCard, SelectInput, TextInput, errorMessage, formatCurrency, CardGridSkeleton } from "@workspacenow/views";
import { Receipt, printReceipt, type ReceiptLine } from "./Receipt";

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
      primaryButtonText={
        <>
          <Printer className="size-4" aria-hidden />
          Print receipt
        </>
      }
      onRequestSubmit={() => printReceipt(result.sale, result.lines)}
    >
      <div className="grid gap-4">
        {result.lowStock.length > 0 && (
          <InlineNotification
            kind="warning"
            lowContrast
            hideCloseButton
            title={`${result.lowStock.join(", ")} reached the reorder level; the low-stock replenishment workflow has started.`}
          />
        )}
        <div className="flex justify-center overflow-x-auto rounded-xl bg-default p-4">
          <div className="shadow-md">
            <Receipt sale={result.sale} lines={result.lines} />
          </div>
        </div>
      </div>
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
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <SectionCard
        title="Products"
        subtitle="Tap a product to add it to the cart"
        actions={
          <div className="w-48">
            <SelectInput label="Store" value={store} onChange={changeStore} options={STORES.map((s) => ({ value: s, label: s }))} />
          </div>
        }
      >
        <div className="grid gap-4">
          <TextInput label="Search" value={search} onChange={setSearch} placeholder="Name or SKU" />
          <QueryState query={products} skeleton={<CardGridSkeleton count={6} className="sm:grid-cols-2 xl:grid-cols-3" />}>
            {(data) => {
              const shown = data.items.filter((p) => !term || String(p.values.name).toLowerCase().includes(term) || String(p.values.sku).toLowerCase().includes(term));
              if (shown.length === 0) return <NoDataFound message="No products match." />;
              return (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {shown.map((p) => {
                    const available = onHand(p.id);
                    const inCart = cart[p.id] ?? 0;
                    const left = (available ?? 0) - inCart;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={left <= 0}
                        onClick={() => setQuantity(p.id, (current) => current + 1)}
                        className="relative grid gap-1 rounded-xl border border-separator bg-surface p-4 text-left transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-separator"
                      >
                        {inCart > 0 && (
                          <span className="absolute top-3 right-3 grid size-6 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground tabular-nums">
                            {inCart}
                          </span>
                        )}
                        <span className="pr-8 text-sm font-medium">{String(p.values.name)}</span>
                        <span className="font-mono text-xs text-muted">{String(p.values.sku)}</span>
                        <span className="mt-1 text-sm font-semibold tabular-nums">{formatCurrency(price(p))}</span>
                        <span className="text-xs text-muted">
                          {available === undefined ? "Not stocked at this store" : left <= 0 ? "No more in stock" : `${left} in stock`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            }}
          </QueryState>
        </div>
      </SectionCard>

      <SectionCard title="Cart" subtitle={store} flush>
        {lines.length === 0 ? (
          <p className="border-t border-separator px-5 py-6 text-sm text-muted">The cart is empty.</p>
        ) : (
          <ul className="border-t border-separator">
            {lines.map(({ product, quantity }) => (
              <li key={product.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-separator px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{String(product.values.name)}</p>
                  <p className="text-xs text-muted tabular-nums">{formatCurrency(price(product))} each</p>
                </div>
                <p className="text-sm font-semibold tabular-nums">{formatCurrency(price(product) * quantity)}</p>
                <div className="col-span-2 flex items-center gap-1">
                  <Button
                    hasIconOnly
                    iconDescription={`One fewer ${String(product.values.name)}`}
                    size="sm"
                    kind="secondary"
                    aria-label={`One fewer ${String(product.values.name)}`}
                    onClick={() => setQuantity(product.id, (current) => current - 1)}
                  >
                    <Minus className="size-3.5" />
                  </Button>
                  <span className="w-8 text-center text-sm tabular-nums" aria-label="Quantity">
                    {quantity}
                  </span>
                  <Button
                    hasIconOnly
                    iconDescription={`One more ${String(product.values.name)}`}
                    size="sm"
                    kind="secondary"
                    aria-label={`One more ${String(product.values.name)}`}
                    disabled={quantity >= (onHand(product.id) ?? 0)}
                    onClick={() => setQuantity(product.id, (current) => current + 1)}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                  <Button
                    hasIconOnly
                    iconDescription={`Remove ${String(product.values.name)}`}
                    size="sm"
                    kind="ghost"
                    className="ml-auto"
                    aria-label={`Remove ${String(product.values.name)}`}
                    onClick={() => setQuantity(product.id, 0)}
                  >
                    <TrashBin className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-4 px-5 py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted">Total</span>
            <span className="text-2xl font-semibold tracking-tight tabular-nums">{formatCurrency(total)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Payment method">
            {(["cash", "card"] as const).map((m) => (
              <Button key={m} aria-pressed={method === m} kind={method === m ? "primary" : "secondary"} onClick={() => setMethod(m)}>
                {m === "cash" ? "Cash" : "Card"}
              </Button>
            ))}
          </div>
          {method === "cash" && (
            <div className="grid gap-2">
              <TextInput label="Cash tendered (LKR)" type="number" value={tendered} onChange={setTendered} />
              {total > 0 && (
                <div className="flex flex-wrap gap-2">
                  {quickCash(total).map((v) => (
                    <Button key={v} size="sm" kind="tertiary" onClick={() => setTendered(String(v))}>
                      {v === total ? "Exact" : formatCurrency(v)}
                    </Button>
                  ))}
                </div>
              )}
              {tendered !== "" && (
                <p className={`text-sm tabular-nums ${change < 0 ? "text-danger" : "text-muted"}`}>
                  {change < 0 ? `${formatCurrency(-change)} short` : `Change ${formatCurrency(change)}`}
                </p>
              )}
            </div>
          )}
          {!!checkout.error && (
            <InlineNotification kind="error" lowContrast hideCloseButton title={errorMessage(checkout.error)} />
          )}
          <Button size="lg" className="w-full" disabled={!canCharge || checkout.isPending} onClick={charge}>
            Charge {formatCurrency(total)}
          </Button>
        </div>
      </SectionCard>

      {result && <ReceiptDialog result={result} onClose={reset} />}
    </div>
  );
}
