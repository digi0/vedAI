"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, SectionTitle, Badge } from "@/components/Card";
import { placeOrder, requestRefillAuth } from "@/lib/actions";
import type {
  DeliveryMethod,
  MedForm,
  MedicationOrder,
  OrderStatus,
  PharmacyItem,
} from "@/lib/types";

const formIcon: Record<MedForm, string> = {
  tablet: "💊",
  capsule: "💊",
  inhaler: "🫁",
  injection: "💉",
  topical: "🧴",
};

const statusTone: Record<OrderStatus, "warn" | "brand" | "ok"> = {
  processing: "warn",
  shipped: "brand",
  delivered: "ok",
};

const deliveryOptions: {
  key: DeliveryMethod;
  label: string;
  eta: string;
  fee: number;
}[] = [
  { key: "pickup", label: "Pharmacy pickup", eta: "Ready in ~2 hrs", fee: 0 },
  { key: "standard", label: "Standard delivery", eta: "2–3 business days", fee: 4.99 },
  { key: "express", label: "Express delivery", eta: "Next business day", fee: 12.99 },
];

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export default function PharmacyClient({
  items,
  orders,
  allergies,
}: {
  items: PharmacyItem[];
  orders: MedicationOrder[];
  allergies: string[];
}) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [delivery, setDelivery] = useState<DeliveryMethod>("standard");
  const [pending, startTransition] = useTransition();
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [refillRequested, setRefillRequested] = useState<Set<string>>(
    new Set(),
  );

  const allergyHits = (item: PharmacyItem) => {
    if (!item.allergyClass) return [];
    const cls = item.allergyClass.toLowerCase();
    return allergies.filter((a) => a.toLowerCase() === cls);
  };

  // Exclude allergy-blocked items from the cart even if stale state has them.
  const cartLines = useMemo(
    () =>
      items
        .filter((m) => (cart[m.id] ?? 0) > 0 && allergyHits(m).length === 0)
        .map((m) => ({ item: m, qty: cart[m.id] })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart, items, allergies],
  );

  const itemCount = cartLines.reduce((s, l) => s + l.qty, 0);
  const subtotal = cartLines.reduce((s, l) => s + l.item.price * l.qty, 0);
  const deliveryFee = deliveryOptions.find((d) => d.key === delivery)?.fee ?? 0;
  const total = subtotal + deliveryFee;

  function setQty(id: string, qty: number) {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = Math.min(qty, 6);
      return next;
    });
  }

  function submit() {
    if (cartLines.length === 0) return;
    startTransition(async () => {
      try {
        const { id } = await placeOrder({
          delivery,
          items: cartLines.map((l) => ({
            name: l.item.name,
            dose: l.item.dose,
            qty: l.qty,
            price: l.item.price,
          })),
        });
        setLastOrderId(id);
        setCart({});
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Order failed");
      }
    });
  }

  function refill(id: string) {
    setRefillRequested((s) => new Set(s).add(id));
    startTransition(async () => {
      await requestRefillAuth(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Order & refill"
        title="Pharmacy"
        action={
          itemCount > 0 ? (
            <Badge tone="brand">🛒 {itemCount} in cart</Badge>
          ) : undefined
        }
      />
      <p className="max-w-2xl text-sm text-[var(--color-fg-muted)]">
        Refill medication straight from the prescriptions on your record. Every
        order is verified against your prescription on file before it ships.
      </p>

      {lastOrderId && (
        <div className="rounded-xl border border-[var(--color-ok)] bg-[var(--color-ok-soft)] p-4">
          <div className="font-medium text-[var(--color-ok)]">
            Order placed — {lastOrderId}
          </div>
          <p className="mt-0.5 text-sm text-[var(--color-fg-muted)]">
            We&apos;re verifying it against your prescriptions. You&apos;ll be
            notified when it ships — track it in order history below.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="text-xs font-medium uppercase tracking-wider text-[var(--color-fg-dim)]">
            From your prescriptions
          </div>
          {items.length === 0 ? (
            <Card>
              <p className="text-sm text-[var(--color-fg-muted)]">
                No medications on file yet. Items appear here once a
                prescription is added to your records.
              </p>
            </Card>
          ) : (
            items.map((m) => {
              const qty = cart[m.id] ?? 0;
              const conflicts = allergyHits(m);
              const isBlocked = conflicts.length > 0;
              const orderable = !isBlocked && m.refillsLeft > 0;
              const isRequested = refillRequested.has(m.id);
              return (
                <article
                  key={m.id}
                  className={`flex items-start gap-3 rounded-lg border bg-[var(--color-surface)] p-4 ${
                    isBlocked
                      ? "border-[var(--color-alert)]"
                      : "border-[var(--color-border)]"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg ${
                      isBlocked
                        ? "bg-[var(--color-alert-soft)]"
                        : "bg-[var(--color-surface-2)]"
                    }`}
                  >
                    <span aria-hidden>{formIcon[m.form]}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">
                        {m.name}{" "}
                        <span className="text-[var(--color-fg-muted)]">
                          {m.dose}
                        </span>
                      </h3>
                      <Badge tone="neutral">{m.form}</Badge>
                      {isBlocked ? (
                        <Badge tone="alert">
                          ⚠ Allergy: {conflicts.join(", ")}
                        </Badge>
                      ) : orderable ? (
                        <Badge tone="ok">{m.refillsLeft} refills left</Badge>
                      ) : (
                        <Badge tone="warn">Refill auth needed</Badge>
                      )}
                    </div>
                    <div className="mt-0.5 text-sm text-[var(--color-fg-muted)]">
                      {m.packSize} · Prescribed by {m.prescribedBy}
                    </div>
                    {m.note && (
                      <p className="mt-2 text-sm text-[var(--color-fg)]">
                        {m.note}
                      </p>
                    )}
                    {isBlocked && (
                      <p className="mt-2 rounded-md bg-[var(--color-alert-soft)] px-3 py-2 text-sm text-[var(--color-alert)]">
                        Blocked — {m.name} is a {m.allergyClass}-class drug
                        and you have a documented {conflicts.join(", ")}{" "}
                        allergy. Talk to {m.prescribedBy} or your PCP before
                        refilling.
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="font-display text-xl">
                        {money(m.price)}
                        <span className="ml-1 text-xs text-[var(--color-fg-dim)]">
                          / fill
                        </span>
                      </div>
                      {isBlocked ? (
                        <button
                          disabled
                          className="cursor-not-allowed rounded-md border border-[var(--color-alert)] bg-[var(--color-alert-soft)] px-4 py-2 text-sm text-[var(--color-alert)]"
                        >
                          Allergy block
                        </button>
                      ) : orderable ? (
                        qty > 0 ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setQty(m.id, qty - 1)}
                              className="h-8 w-8 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-lg leading-none"
                              aria-label={`Decrease ${m.name}`}
                            >
                              −
                            </button>
                            <span className="w-6 text-center text-sm font-medium">
                              {qty}
                            </span>
                            <button
                              onClick={() => setQty(m.id, qty + 1)}
                              className="h-8 w-8 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-lg leading-none"
                              aria-label={`Increase ${m.name}`}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setQty(m.id, 1)}
                            className="rounded-md bg-[var(--color-brand)] px-4 py-2 text-sm text-white transition hover:bg-[var(--color-brand)]/90"
                          >
                            Add to order
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => refill(m.id)}
                          disabled={isRequested}
                          className={`rounded-md px-4 py-2 text-sm transition ${
                            isRequested
                              ? "border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-fg-muted)]"
                              : "border border-[var(--color-border-strong)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)]"
                          }`}
                        >
                          {isRequested ? "Refill requested ✓" : "Request refill"}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div>
          <div className="sticky top-20">
            <Card>
              <h3 className="font-medium">Your order</h3>
              {cartLines.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--color-fg-muted)]">
                  No medication selected yet. Add a refill from your
                  prescriptions to get started.
                </p>
              ) : (
                <>
                  <ul className="mt-3 space-y-2 text-sm">
                    {cartLines.map((l) => (
                      <li
                        key={l.item.id}
                        className="flex justify-between gap-3"
                      >
                        <span>
                          <span className="font-medium">{l.item.name}</span>{" "}
                          <span className="text-[var(--color-fg-muted)]">
                            {l.item.dose} · ×{l.qty}
                          </span>
                        </span>
                        <span>{money(l.item.price * l.qty)}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 border-t border-[var(--color-border)] pt-3">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--color-fg-dim)]">
                      Delivery
                    </div>
                    <div className="space-y-1.5">
                      {deliveryOptions.map((d) => (
                        <button
                          key={d.key}
                          onClick={() => setDelivery(d.key)}
                          className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition ${
                            delivery === d.key
                              ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]"
                              : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]"
                          }`}
                        >
                          <span>
                            <span className="font-medium">{d.label}</span>
                            <span className="block text-xs text-[var(--color-fg-muted)]">
                              {d.eta}
                            </span>
                          </span>
                          <span className="shrink-0">
                            {d.fee === 0 ? "Free" : money(d.fee)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 space-y-1 border-t border-[var(--color-border)] pt-3 text-sm">
                    <div className="flex justify-between text-[var(--color-fg-muted)]">
                      <span>Subtotal</span>
                      <span>{money(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-[var(--color-fg-muted)]">
                      <span>Delivery</span>
                      <span>
                        {deliveryFee === 0 ? "Free" : money(deliveryFee)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 font-medium">
                      <span>Total</span>
                      <span className="font-display text-lg">
                        {money(total)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={submit}
                    disabled={pending}
                    className="mt-4 w-full rounded-md bg-[var(--color-brand)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-brand)]/90 disabled:opacity-60"
                  >
                    {pending
                      ? "Placing order…"
                      : `Place order · ${money(total)}`}
                  </button>
                  <p className="mt-2 text-xs text-[var(--color-fg-dim)]">
                    Orders are verified against your prescriptions on file
                    before dispatch.
                  </p>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>

      <section>
        <SectionTitle eyebrow="Track" title="Order history" />
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--color-border-strong)] p-10 text-center text-[var(--color-fg-muted)]">
              No orders yet.
            </div>
          ) : (
            orders.map((o) => (
              <Card key={o.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{o.id}</span>
                      <Badge tone={statusTone[o.status]}>{o.status}</Badge>
                    </div>
                    <div className="mt-0.5 text-sm text-[var(--color-fg-muted)]">
                      {new Date(o.placedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      ·{" "}
                      {
                        deliveryOptions.find((d) => d.key === o.delivery)
                          ?.label
                      }
                    </div>
                    <div className="mt-1.5 text-sm">
                      {o.items
                        .map((i) => `${i.name} ${i.dose} ×${i.qty}`)
                        .join(", ")}
                    </div>
                  </div>
                  <div className="font-display text-xl">{money(o.total)}</div>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
