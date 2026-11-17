import React from "react";
import { LayoutDashboard, Package, ShoppingBag, Store, UserRound, LogOut } from "lucide-react";
import { Pill, cx } from "./ui";

export const SECTIONS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "stock", label: "Stock", icon: Package },
  { id: "orders", label: "Orders", icon: ShoppingBag, soon: true },
  { id: "shop", label: "My shop", icon: Store },
  { id: "account", label: "Account", icon: UserRound },
];

/**
 * The frame around every partner screen: a navy sidebar on a wide screen, a
 * slim top bar and a tab bar at the thumb on a phone.
 */
export default function PartnerShell({ partner, settings, section, onSection, onSignOut, children }) {
  const name = settings?.displayName || partner?.name || "Your shop";
  const open = settings?.isOpen !== false;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "P";

  return (
    <div className="min-h-screen bg-[#F4F6FA] font-sans text-slate-900 lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      {/* Sidebar (wide screens) */}
      <aside className="hidden lg:flex flex-col bg-[#061838] text-white sticky top-0 h-screen">
        <div className="h-[72px] px-6 flex items-center border-b border-white/10">
          <img src="/dashit-wordmark-white.png" alt="DASHit" className="h-7 w-auto" />
          <span className="ml-3 text-[10px] font-extrabold tracking-[0.2em] uppercase text-[#FF8A47] pt-0.5">Partner</span>
        </div>
        <nav className="flex-1 px-3 py-5 space-y-1" aria-label="Partner sections">
          {SECTIONS.map(({ id, label, icon: Icon, soon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                onClick={() => onSection(id)}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "w-full flex items-center gap-3 h-11 px-3.5 rounded-xl text-[15px] font-bold transition cursor-pointer",
                  active ? "bg-white/12 text-white shadow-[inset_3px_0_0_#FF5B00]" : "text-white/65 hover:bg-white/[0.07] hover:text-white"
                )}
              >
                <Icon className={cx("w-[19px] h-[19px]", active ? "text-[#FF8A47]" : "")} />
                <span className="flex-1 text-left">{label}</span>
                {soon && <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/50 bg-white/10 rounded-md px-1.5 py-0.5">Soon</span>}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] p-3">
            <span className="w-10 h-10 rounded-xl bg-[#FF5B00] flex items-center justify-center font-extrabold text-sm shrink-0">{initials}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold truncate">{name}</div>
              <div className={cx("text-xs font-semibold", open ? "text-emerald-300" : "text-amber-300")}>{open ? "Open for customers" : "Closed right now"}</div>
            </div>
            <button onClick={onSignOut} aria-label="Sign out" className="w-9 h-9 rounded-lg text-white/60 hover:bg-white/10 hover:text-white flex items-center justify-center cursor-pointer">
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex flex-col min-h-screen">
        {/* Top bar (phone) */}
        <header className="lg:hidden sticky top-0 z-30 bg-[#061838] text-white pt-[env(safe-area-inset-top)]">
          <div className="h-14 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <img src="/dashit-mark-white.png" alt="DASHit" className="h-6 w-auto" />
              <span className="font-extrabold truncate">{name}</span>
            </div>
            <Pill tone={open ? "ok" : "low"} dot className="shrink-0">{open ? "Open" : "Closed"}</Pill>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 pb-28 lg:pb-12">{children}</main>

        {/* Tab bar (phone) */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 pb-[env(safe-area-inset-bottom)]" aria-label="Partner sections">
          <div className="grid grid-cols-5">
            {SECTIONS.map(({ id, label, icon: Icon }) => {
              const active = section === id;
              return (
                <button key={id} onClick={() => onSection(id)} aria-current={active ? "page" : undefined} className="h-16 flex flex-col items-center justify-center gap-1 cursor-pointer">
                  <Icon className={cx("w-[22px] h-[22px]", active ? "text-[#FF5B00]" : "text-slate-400")} />
                  <span className={cx("text-[11px] font-bold", active ? "text-[#061838]" : "text-slate-500")}>{label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
