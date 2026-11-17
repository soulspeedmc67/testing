import React, { useMemo } from "react";
import { Boxes, Layers, IndianRupee, AlertTriangle, MapPin, ShoppingBag, ArrowRight, Plus, PackageCheck } from "lucide-react";
import { Card, Kpi, Pill, Button, SectionTitle, Spinner, AreaDiagram, EmptyState } from "./ui";
import { summarise, stockState, formatINR, timeAgo } from "../../lib/partnerStock";

const greeting = (d = new Date()) => {
  const h = d.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

/** The first screen: how the shop stands today, and what needs doing. */
export default function OverviewSection({ partner, settings, products, loading, error, onGo, onRestock }) {
  const s = useMemo(() => summarise(products), [products]);
  const attention = useMemo(
    () => (products || []).filter((p) => ["out", "low"].includes(stockState(p))).sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0)).slice(0, 6),
    [products]
  );
  const name = settings?.displayName || partner?.name || "your shop";
  const km = Number(partner?.maxDeliveryKm) || 0;

  return (
    <div className="space-y-6">
      <SectionTitle
        title={`${greeting()}, ${name}`}
        hint="Here is how your shop stands right now."
        right={<Button onClick={() => onGo("stock", { add: true })} size="md"><Plus className="w-4 h-4" />Add an item</Button>}
      />

      {error && (
        <div role="alert" className="rounded-xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3 text-sm font-semibold text-rose-700">
          We couldn't load your stock just now. Check your connection and refresh.
        </div>
      )}

      {loading ? (
        <Spinner label="Loading your shop" />
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <Kpi icon={Boxes} tone="navy" label="Items listed" value={s.items} sub={s.hidden ? `${s.hidden} hidden from customers` : "all visible"} />
            <Kpi icon={Layers} tone="brand" label="Units in stock" value={Number(s.units).toLocaleString("en-IN")} sub={s.lastUpdated ? `Updated ${timeAgo(s.lastUpdated)}` : "No updates yet"} />
            <Kpi icon={IndianRupee} tone="green" label="Stock value" value={formatINR(s.stockValue)} sub="at your selling prices" />
            <Kpi
              icon={AlertTriangle}
              tone={s.low + s.out > 0 ? "rose" : "green"}
              label="Needs attention"
              value={s.low + s.out}
              sub={s.low + s.out > 0 ? `${s.out} out, ${s.low} running low` : "Everything is stocked"}
            />
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4 sm:gap-6">
            {/* What needs doing */}
            <Card className="overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
                <div>
                  <h2 className="font-extrabold text-[#061838]">Needs restocking</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Lowest first. Tap + to add stock.</p>
                </div>
                <button onClick={() => onGo("stock", { filter: "attention" })} className="text-[13px] font-bold text-[#FF5B00] hover:underline inline-flex items-center gap-1 cursor-pointer">
                  See all <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {attention.length === 0 ? (
                <EmptyState
                  icon={PackageCheck}
                  title={s.items ? "All stocked up" : "Your shelves are empty"}
                  text={s.items ? "Nothing is running low. Nice work." : "Add your first item to start building your shop."}
                  action={!s.items && <Button onClick={() => onGo("stock", { add: true })}><Plus className="w-4 h-4" />Add an item</Button>}
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {attention.map((p) => {
                    const out = stockState(p) === "out";
                    return (
                      <li key={p.id} className="px-5 py-3.5 flex items-center gap-3.5">
                        <span className="w-11 h-11 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-slate-400">
                          {p.img ? <img src={p.img} alt="" className="w-full h-full object-cover" /> : <Boxes className="w-5 h-5" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[15px] font-bold text-slate-900 truncate">{p.name}</div>
                          <div className="mt-0.5 flex items-center gap-2">
                            <Pill tone={out ? "out" : "low"}>{out ? "Out of stock" : `${p.stock} left`}</Pill>
                            <span className="text-xs text-slate-500">{formatINR(p.price)}{p.unit ? ` · ${p.unit}` : ""}</span>
                          </div>
                        </div>
                        <Button variant="soft" size="sm" onClick={() => onRestock?.(p, Number(p.stock || 0) + 10)} aria-label={`Add 10 to ${p.name}`}>
                          <Plus className="w-4 h-4" />10
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            {/* Delivery area + orders */}
            <div className="space-y-4 sm:space-y-6">
              <Card className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-extrabold text-[#061838] flex items-center gap-2"><MapPin className="w-[18px] h-[18px] text-[#FF5B00]" />Your delivery area</h2>
                    <p className="text-xs text-slate-500 mt-1">Set up with DASHit for your part of town.</p>
                  </div>
                  <Pill tone="brand">Up to {km || "?"} km</Pill>
                </div>
                <div className="mt-3 mx-auto w-[190px] h-[190px]"><AreaDiagram km={km} /></div>
                <p className="mt-2 text-xs text-slate-500 text-center">Customers within this distance of your shop can order from you. To change it, contact DASHit.</p>
              </Card>

              <Card className="p-5">
                <div className="flex items-start gap-3.5">
                  <span className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0"><ShoppingBag className="w-5 h-5" /></span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-extrabold text-[#061838]">Orders</h2>
                      <Pill tone="info">Coming soon</Pill>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">Orders from customers in your area will show up here once ordering opens for your shop. DASHit will let you know.</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
