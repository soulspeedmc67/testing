import React, { useEffect, useState } from "react";
import { MapPin, Lock, LogOut, CheckCircle2, Info, KeyRound } from "lucide-react";
import { Card, SectionTitle, Pill, Button, Field, inputCls, cx, AreaDiagram } from "./ui";

/** "My shop": the details customers see, and whether he is taking orders. */
export function ShopSection({ partner, settings, onSave }) {
  const [form, setForm] = useState({ displayName: "", tagline: "", phone: "", whatsapp: "", address: "", hours: "", isOpen: true });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    setForm({
      displayName: settings?.displayName ?? partner?.name ?? "",
      tagline: settings?.tagline ?? "",
      phone: settings?.phone ?? partner?.phone ?? "",
      whatsapp: settings?.whatsapp ?? "",
      address: settings?.address ?? partner?.address ?? "",
      hours: settings?.hours ?? "",
      isOpen: settings?.isOpen !== false,
    });
  }, [settings, partner]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const km = Number(partner?.maxDeliveryKm) || 0;

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await onSave({ ...form, displayName: form.displayName.trim(), tagline: form.tagline.trim() });
      setMsg({ ok: true, text: "Saved." });
    } catch (e) {
      setMsg({ ok: false, text: "That could not be saved. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle title="My shop" hint="How your shop appears, and whether you're taking orders." />

      <Card className="p-5 sm:p-6">
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, isOpen: !f.isOpen }))}
          aria-pressed={form.isOpen}
          className="w-full flex items-center justify-between gap-4 text-left cursor-pointer"
        >
          <span>
            <span className="flex items-center gap-2.5">
              <span className="text-[17px] font-extrabold text-[#061838]">{form.isOpen ? "Open for customers" : "Closed right now"}</span>
              <Pill tone={form.isOpen ? "ok" : "low"} dot>{form.isOpen ? "Open" : "Closed"}</Pill>
            </span>
            <span className="block mt-1 text-sm text-slate-500">Switch off when you're not taking orders. Press Save to apply.</span>
          </span>
          <span className={cx("w-14 h-8 rounded-full p-1 transition shrink-0", form.isOpen ? "bg-emerald-500" : "bg-slate-300")}>
            <span className={cx("block w-6 h-6 rounded-full bg-white shadow transition", form.isOpen ? "translate-x-6" : "")} />
          </span>
        </button>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-extrabold text-[#061838] mb-5">Shop details</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Shop name"><input value={form.displayName} onChange={set("displayName")} maxLength={80} className={inputCls} /></Field>
          <Field label="Tagline" hint="A short line under your name"><input value={form.tagline} onChange={set("tagline")} maxLength={120} placeholder="Fresh groceries, every day" className={inputCls} /></Field>
          <Field label="Phone"><input value={form.phone} onChange={set("phone")} maxLength={20} inputMode="tel" className={inputCls} /></Field>
          <Field label="WhatsApp" hint="Optional"><input value={form.whatsapp} onChange={set("whatsapp")} maxLength={20} inputMode="tel" className={inputCls} /></Field>
          <Field label="Opening hours" hint="For example 8 am to 10 pm"><input value={form.hours} onChange={set("hours")} maxLength={80} className={inputCls} /></Field>
          <Field label="Shop address"><input value={form.address} onChange={set("address")} maxLength={200} className={inputCls} /></Field>
        </div>
        <div className="mt-6 flex items-center gap-4 flex-wrap">
          <Button onClick={save} busy={busy}>Save changes</Button>
          {msg && (
            <span role="status" className={cx("inline-flex items-center gap-1.5 text-sm font-bold", msg.ok ? "text-emerald-600" : "text-rose-600")}>
              {msg.ok && <CheckCircle2 className="w-4 h-4" />}{msg.text}
            </span>
          )}
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-5 flex-wrap sm:flex-nowrap">
          <div className="w-[150px] h-[150px] shrink-0"><AreaDiagram km={km} /></div>
          <div className="min-w-0">
            <h2 className="font-extrabold text-[#061838] flex items-center gap-2"><MapPin className="w-[18px] h-[18px] text-[#FF5B00]" />Delivery area</h2>
            <p className="mt-1.5 text-[15px] text-slate-700">Customers up to <b>{km || "?"} km</b> from your shop can order from you.</p>
            <p className="mt-2 flex items-start gap-2 text-sm text-slate-500"><Info className="w-4 h-4 mt-0.5 shrink-0" />DASHit sets your delivery area with you. To make it wider or narrower, contact DASHit.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

/** "Account": who he is signed in as, his password, and signing out. */
export function AccountSection({ email, partnerName, onChangePassword, onSignOut }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const mismatch = again !== "" && next !== again;
  const submit = async (e) => {
    e.preventDefault();
    if (next.length < 8) return setMsg({ ok: false, text: "Use at least 8 characters." });
    if (next !== again) return setMsg({ ok: false, text: "The two new passwords don't match." });
    setBusy(true);
    setMsg(null);
    try {
      await onChangePassword(current, next);
      setCurrent(""); setNext(""); setAgain("");
      setMsg({ ok: true, text: "Password changed." });
    } catch (err) {
      setMsg({ ok: false, text: err?.message || "Could not change the password." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle title="Account" hint="Your sign-in and security." />

      <Card className="p-5 sm:p-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Signed in as</div>
          <div className="mt-1 text-[17px] font-extrabold text-[#061838] truncate">{email || "—"}</div>
          {partnerName && <div className="text-sm text-slate-500">{partnerName}</div>}
        </div>
        <Button variant="ghost" onClick={onSignOut}><LogOut className="w-4 h-4" />Sign out</Button>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-extrabold text-[#061838] flex items-center gap-2"><KeyRound className="w-[18px] h-[18px] text-[#FF5B00]" />Change password</h2>
        <p className="mt-1 text-sm text-slate-500">Choose something only you know. You'll stay signed in.</p>
        <form onSubmit={submit} className="mt-5 grid gap-5 max-w-md">
          <Field label="Current password"><input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputCls} /></Field>
          <Field label="New password" hint="At least 8 characters"><input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={inputCls} /></Field>
          <Field label="New password again" error={mismatch ? "These don't match yet." : ""}><input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} className={inputCls} /></Field>
          <div className="flex items-center gap-4 flex-wrap">
            <Button type="submit" busy={busy} disabled={!current || !next || !again}><Lock className="w-4 h-4" />Change password</Button>
            {msg && <span role="status" className={cx("text-sm font-bold", msg.ok ? "text-emerald-600" : "text-rose-600")}>{msg.text}</span>}
          </div>
        </form>
      </Card>

      <Card className="p-5 sm:p-6 bg-[#061838] text-white ring-0">
        <h2 className="font-extrabold">Need help?</h2>
        <p className="mt-1.5 text-sm text-white/70 max-w-lg">If you can't sign in, want your delivery area changed, or have a question about your account, contact DASHit and we'll sort it out.</p>
      </Card>
    </div>
  );
}
