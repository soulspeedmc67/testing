import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Users, Plus, MapPin, RefreshCw, KeyRound, Copy, Power, AlertTriangle, Search } from "lucide-react";
import AdminSheet from "./AdminSheet";
import { watchPartners, loadPartnerProducts, updatePartner, partnerApi } from "../../lib/partners";
import { summarise, stockState, formatINR, timeAgo } from "../../lib/partnerStock";

const EMPTY = { name: "", ownerName: "", phone: "", email: "", city: "", address: "", latLng: "", maxDeliveryKm: "10", commissionPercent: "0" };

/** "34.0836, 74.7973" (pasted from Google Maps) -> [lat, lng], or null. */
const parseLatLng = (text) => {
  const m = String(text || "").match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const lat = Number(m[1]), lng = Number(m[2]);
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? [lat, lng] : null;
};

/**
 * The owner's side of partner shops: add one (the server makes his login and
 * shows the password once), set how far he may deliver, switch him off, reset
 * his password, and see his stock and figures. A partner's stock is read-only
 * here (firestore.rules): the owner sees it, the partner runs it.
 */
export default function PartnersView({ showToast = () => {}, darkMode = false }) {
  const [partners, setPartners] = useState(undefined); // undefined = loading, null = can't read
  const [stock, setStock] = useState({}); // partnerId -> products
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [creds, setCreds] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [km, setKm] = useState("");
  const [pct, setPct] = useState("");

  useEffect(() => watchPartners(setPartners), []);

  const refreshStock = useCallback(async (id) => {
    try {
      const list = await loadPartnerProducts(id);
      setStock((s) => ({ ...s, [id]: list }));
    } catch (e) {
      setStock((s) => ({ ...s, [id]: null }));
    }
  }, []);

  // Each partner's stock is read once when the list appears (not live: it saves reads).
  useEffect(() => {
    (partners || []).forEach((p) => { if (stock[p.id] === undefined) refreshStock(p.id); });
  }, [partners]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (partners || []).find((p) => p.id === openId) || null;
  useEffect(() => { if (open) { setKm(String(open.maxDeliveryKm ?? "")); setPct(String(open.commissionPercent ?? 0)); } }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps

  const card = darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200";
  const subtle = darkMode ? "text-zinc-400" : "text-slate-500";
  const inputCls = `w-full min-h-[44px] rounded-xl border px-3 text-sm outline-none focus:border-emerald-500 ${darkMode ? "bg-[#0D0E12] border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (partners || []).filter((p) => !n || [p.name, p.city, p.ownerName, p.phone].some((v) => String(v || "").toLowerCase().includes(n)));
  }, [partners, q]);

  const create = async () => {
    const ll = parseLatLng(form.latLng);
    if (!ll) return setFormError("Paste the shop's location as two numbers, like 34.0836, 74.7973 (on Google Maps, right-click the shop and tap the numbers).");
    setBusy(true);
    setFormError("");
    try {
      const r = await partnerApi("create", {
        name: form.name, ownerName: form.ownerName, phone: form.phone, email: form.email, city: form.city, address: form.address,
        lat: ll[0], lng: ll[1], maxDeliveryKm: Number(form.maxDeliveryKm), commissionPercent: Number(form.commissionPercent || 0),
      });
      setAdding(false);
      setForm(EMPTY);
      setCreds({ name: form.name, email: r.email, password: r.password });
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveTerms = async () => {
    const d = Number(km), c = Number(pct || 0);
    if (!(d >= 0.5 && d <= 100)) return showToast("The delivery distance must be between 0.5 and 100 km.");
    if (!(c >= 0 && c <= 50)) return showToast("The commission must be between 0 and 50 percent.");
    try {
      await updatePartner(open.id, { maxDeliveryKm: d, commissionPercent: c });
      showToast("Saved. His delivery distance is now " + d + " km.");
    } catch (e) {
      showToast("Could not save that.");
    }
  };

  const toggleActive = async () => {
    const next = !(open.active !== false);
    if (!next && typeof window !== "undefined" && !window.confirm(`Switch ${open.name} off? He will be signed out and cannot use his dashboard until you switch him back on.`)) return;
    try {
      await partnerApi("set-active", { partnerId: open.id, active: next });
      showToast(next ? `${open.name} is switched on.` : `${open.name} is switched off.`);
    } catch (e) {
      showToast(e.message);
    }
  };

  const reset = async () => {
    if (typeof window !== "undefined" && !window.confirm(`Make a new password for ${open.name}? The old one stops working.`)) return;
    try {
      const r = await partnerApi("reset-password", { partnerId: open.id });
      setCreds({ name: open.name, email: r.email, password: r.password });
    } catch (e) {
      showToast(e.message);
    }
  };

  const copy = (text) => { try { navigator.clipboard.writeText(text); showToast("Copied"); } catch (e) { showToast("Select and copy it by hand."); } };
  const shareText = creds ? `Hi! Your DASHit partner dashboard is ready.\nSign in at https://dashit.co.in/partner\nEmail: ${creds.email}\nPassword: ${creds.password}\nPlease change the password after you sign in (Account).` : "";

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl p-5 border flex items-start justify-between flex-wrap gap-4 ${card}`}>
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center space-x-2"><Users className="w-5 h-5 text-emerald-500" /><h2 className="font-black text-base">Partner shops</h2></div>
          <p className={`text-xs ${subtle}`}>Other shop owners who run their own stock on DASHit. They see only their own shop; you see all of them.</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setFormError(""); setAdding(true); }} className="flex items-center space-x-1.5 text-xs font-black px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer">
          <Plus className="w-4 h-4" /><span>Add a partner</span>
        </button>
      </div>

      {partners === null && <div className={`rounded-2xl p-5 border text-sm ${card}`}>The partner list can't be read. Make sure the new security rules are deployed, then refresh.</div>}
      {partners === undefined && <div className={`rounded-2xl p-5 border text-sm ${subtle} ${card}`}>Loading partners…</div>}
      {partners && partners.length > 4 && (
        <div className="relative"><Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${subtle}`} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search partners" className={`${inputCls} pl-10`} /></div>
      )}
      {partners && partners.length === 0 && <div className={`rounded-2xl p-8 border text-center text-sm ${subtle} ${card}`}>No partners yet. Add the first one and he gets his own login.</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((p) => {
          const list = stock[p.id];
          const s = Array.isArray(list) ? summarise(list) : null;
          const on = p.active !== false;
          return (
            <button key={p.id} onClick={() => setOpenId(p.id)} className={`text-left rounded-2xl p-4 border cursor-pointer hover:border-emerald-500/60 transition ${card}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-black text-sm truncate">{p.name}</div>
                  <div className={`text-xs mt-0.5 ${subtle}`}>{[p.ownerName, p.city].filter(Boolean).join(" · ") || p.phone}</div>
                </div>
                <span className={`text-[11px] font-black px-2.5 py-1 rounded-full ${on ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`}>{on ? "Active" : "Switched off"}</span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs font-bold"><MapPin className="w-3.5 h-3.5 text-emerald-500" />Delivers up to {p.maxDeliveryKm} km</div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                {[["Items", s ? s.items : "–"], ["Units", s ? Number(s.units).toLocaleString("en-IN") : "–"], ["Stock value", s ? formatINR(s.stockValue) : "–"], ["Low / out", s ? s.low + s.out : "–"]].map(([l, v]) => (
                  <div key={l} className={`rounded-xl py-2 ${darkMode ? "bg-zinc-900" : "bg-slate-50"}`}><div className="text-sm font-black tabular-nums">{v}</div><div className={`text-[10px] font-bold ${subtle}`}>{l}</div></div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Add a partner */}
      <AdminSheet open={adding} onClose={() => !busy && setAdding(false)} labelledBy="add-partner-title" darkMode={darkMode}>
        <div className="p-5 overflow-y-auto space-y-3">
          <h3 id="add-partner-title" className="font-black text-lg">Add a partner</h3>
          <p className={`text-xs ${subtle}`}>He gets his own login. The password is shown once, after you press Create.</p>
          {formError && <div role="alert" className="rounded-xl bg-rose-500/10 text-rose-600 text-xs font-bold p-3">{formError}</div>}
          <input className={inputCls} placeholder="Shop name" value={form.name} onChange={set("name")} />
          <input className={inputCls} placeholder="Owner's name" value={form.ownerName} onChange={set("ownerName")} />
          <input className={inputCls} placeholder="Mobile number (10 digits)" inputMode="tel" value={form.phone} onChange={set("phone")} />
          <input className={inputCls} placeholder="Login email (optional: we make one if empty)" inputMode="email" value={form.email} onChange={set("email")} />
          <input className={inputCls} placeholder="Town / city" value={form.city} onChange={set("city")} />
          <input className={inputCls} placeholder="Shop address" value={form.address} onChange={set("address")} />
          <input className={inputCls} placeholder="Shop location: 34.0836, 74.7973" value={form.latLng} onChange={set("latLng")} />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold">Delivers up to (km)<input className={`${inputCls} mt-1`} inputMode="decimal" value={form.maxDeliveryKm} onChange={set("maxDeliveryKm")} /></label>
            <label className="text-xs font-bold">Commission (%)<input className={`${inputCls} mt-1`} inputMode="decimal" value={form.commissionPercent} onChange={set("commissionPercent")} /></label>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setAdding(false)} disabled={busy} className="flex-1 min-h-[44px] rounded-xl border text-xs font-bold cursor-pointer">Cancel</button>
            <button onClick={create} disabled={busy || !form.name || !form.phone} className="flex-1 min-h-[44px] rounded-xl bg-emerald-500 text-white text-xs font-black disabled:opacity-50 cursor-pointer">{busy ? "Creating…" : "Create partner"}</button>
          </div>
        </div>
      </AdminSheet>

      {/* The login details, shown once */}
      <AdminSheet open={!!creds} onClose={() => setCreds(null)} labelledBy="creds-title" darkMode={darkMode}>
        {creds && (
          <div className="p-5 space-y-3">
            <h3 id="creds-title" className="font-black text-lg">Login for {creds.name}</h3>
            <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 text-amber-700 text-xs font-bold p-3"><AlertTriangle className="w-4 h-4 shrink-0" />Copy this now. The password is not saved anywhere, so you can't see it again (you can make a new one).</div>
            <div className={`rounded-xl p-3 text-sm font-mono break-all ${darkMode ? "bg-zinc-900" : "bg-slate-50"}`}>
              <div>Sign in: dashit.co.in/partner</div><div>Email: {creds.email}</div><div>Password: {creds.password}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => copy(shareText)} className="flex-1 min-h-[44px] rounded-xl bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"><Copy className="w-4 h-4" />Copy message</button>
              <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="flex-1 min-h-[44px] rounded-xl border text-xs font-bold flex items-center justify-center cursor-pointer">WhatsApp</a>
            </div>
            <button onClick={() => setCreds(null)} className="w-full min-h-[44px] rounded-xl border text-xs font-bold cursor-pointer">Done</button>
          </div>
        )}
      </AdminSheet>

      {/* One partner */}
      <AdminSheet open={!!open} onClose={() => setOpenId(null)} labelledBy="partner-title" darkMode={darkMode}>
        {open && (() => {
          const list = Array.isArray(stock[open.id]) ? stock[open.id] : [];
          const s = summarise(list);
          const attention = list.filter((p) => ["out", "low"].includes(stockState(p))).slice(0, 8);
          return (
            <div className="p-5 overflow-y-auto space-y-4">
              <div><h3 id="partner-title" className="font-black text-lg">{open.name}</h3>
                <div className={`text-xs ${subtle}`}>{[open.ownerName, open.city, open.phone].filter(Boolean).join(" · ")}</div>
                <div className={`text-xs ${subtle}`}>Login: {open.loginEmail || "—"}</div></div>

              <div className="grid grid-cols-2 gap-2 text-center">
                {[["Items", s.items], ["Units in stock", Number(s.units).toLocaleString("en-IN")], ["Stock value", formatINR(s.stockValue)], ["Last stock change", timeAgo(s.lastUpdated)]].map(([l, v]) => (
                  <div key={l} className={`rounded-xl py-3 ${darkMode ? "bg-zinc-900" : "bg-slate-50"}`}><div className="text-sm font-black">{v}</div><div className={`text-[10px] font-bold ${subtle}`}>{l}</div></div>
                ))}
              </div>

              <div className={`rounded-xl border p-3 space-y-2 ${card}`}>
                <div className="text-xs font-black">How far he may deliver (km)</div>
                <input type="range" min="1" max="50" step="0.5" value={Math.min(50, Number(km) || 1)} onChange={(e) => setKm(e.target.value)} className="w-full accent-emerald-500" />
                <div className="grid grid-cols-2 gap-3">
                  <input className={inputCls} inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value)} aria-label="Delivery distance in km" />
                  <label className="text-[11px] font-bold">Commission %<input className={`${inputCls} mt-1`} inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} /></label>
                </div>
                <button onClick={saveTerms} className="w-full min-h-[44px] rounded-xl bg-emerald-500 text-white text-xs font-black cursor-pointer">Save</button>
                <p className={`text-[11px] ${subtle}`}>Only you can change this. It applies to his orders when ordering opens for his area.</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5"><div className="text-xs font-black">Needs restocking</div>
                  <button onClick={() => refreshStock(open.id)} className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 cursor-pointer"><RefreshCw className="w-3 h-3" />Refresh</button></div>
                {attention.length === 0 ? <div className={`text-xs ${subtle}`}>{list.length ? "Nothing is running low." : "He hasn't added any stock yet."}</div> : attention.map((p) => (
                  <div key={p.id} className="flex justify-between text-xs py-1.5 border-b border-slate-100 dark:border-zinc-800"><span className="truncate pr-3">{p.name}</span><b>{Number(p.stock) <= 0 ? "Out" : p.stock + " left"}</b></div>
                ))}
              </div>

              <div className="flex gap-2">
                <button onClick={reset} className="flex-1 min-h-[44px] rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"><KeyRound className="w-4 h-4" />New password</button>
                <button onClick={toggleActive} className={`flex-1 min-h-[44px] rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer ${open.active !== false ? "border border-rose-300 text-rose-600" : "bg-emerald-500 text-white"}`}><Power className="w-4 h-4" />{open.active !== false ? "Switch off" : "Switch on"}</button>
              </div>
            </div>
          );
        })()}
      </AdminSheet>
    </div>
  );
}
