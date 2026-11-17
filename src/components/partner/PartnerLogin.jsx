import React, { useState } from "react";
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Boxes, MapPin, LineChart } from "lucide-react";
import { Button, Field, inputCls } from "./ui";

/**
 * The partner's front door: email and password, nothing to sign up for. The
 * login details are given to him by DASHit when he is added, so there is no
 * "create account" and nothing to guess.
 */
export default function PartnerLogin({ onSubmit, error = "", busy = false }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (busy) return;
    onSubmit?.(email.trim(), password);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] bg-[#F4F6FA] font-sans">
      {/* Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#061838] text-white p-12 xl:p-16">
        <div className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full bg-[#FF5B00]/25 blur-3xl" />
        <div className="absolute -bottom-48 -left-32 w-[480px] h-[480px] rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative">
          <img src="/dashit-wordmark-white.png" alt="DASHit" className="h-8 w-auto" />
        </div>
        <div className="relative max-w-md">
          <p className="text-[13px] font-bold tracking-[0.22em] uppercase text-[#FF8A47]">Partner portal</p>
          <h2 className="mt-4 text-4xl xl:text-[44px] leading-[1.08] font-extrabold tracking-tight">Run your shop on DASHit.</h2>
          <p className="mt-4 text-[17px] text-white/70 leading-relaxed">Your own stock, your own dashboard, backed by the DASHit app your customers already know.</p>
          <ul className="mt-9 space-y-4">
            {[
              [Boxes, "Your stock, in one place", "Add items, set prices and keep counts up to date."],
              [MapPin, "Your delivery area", "Set up with DASHit for your part of town."],
              [LineChart, "See how you're doing", "Stock value, what's running low, what needs restocking."],
            ].map(([Icon, t, d]) => (
              <li key={t} className="flex gap-4">
                <span className="mt-0.5 w-10 h-10 shrink-0 rounded-xl bg-white/10 ring-1 ring-white/15 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#FF8A47]" />
                </span>
                <div>
                  <div className="font-bold">{t}</div>
                  <div className="text-sm text-white/60">{d}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/40">&copy; DASHit. Partner accounts are created by DASHit only.</p>
      </aside>

      {/* Form */}
      <main className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden mb-10 flex justify-center">
            <img src="/dashit-logo-centered.png" alt="DASHit" className="h-24 w-auto" />
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-[#061838]">Sign in</h1>
          <p className="mt-2 text-[15px] text-slate-500">Use the email and password DASHit gave you.</p>

          <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
            <Field label="Email">
              <div className="relative">
                <Mail className="w-[18px] h-[18px] text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourshop.com"
                  className={`${inputCls} pl-11`}
                  required
                />
              </div>
            </Field>
            <Field label="Password">
              <div className="relative">
                <Lock className="w-[18px] h-[18px] text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className={`${inputCls} pl-11 pr-12`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                >
                  {show ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </Field>

            {error && (
              <div role="alert" className="rounded-xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3 text-sm font-semibold text-rose-700">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" busy={busy} disabled={!email || !password} className="w-full">
              Sign in
            </Button>
          </form>

          <div className="mt-8 flex items-start gap-3 rounded-xl bg-white ring-1 ring-slate-900/[0.06] p-4">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[13px] leading-relaxed text-slate-600">
              Forgot your password, or can't sign in? Contact DASHit and we'll reset it for you.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
