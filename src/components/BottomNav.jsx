import Link from "next/link";
import { useRouter } from "next/router";
import { Home, Search, Package, User, ShoppingBag } from "lucide-react";

export default function BottomNav({ cartCount = 0 }) {
  const router = useRouter();
  const currentPath = router.pathname;

  const NAV_ITEMS = [
    { id: "home", label: "Home", icon: Home, path: "/" },
    { id: "search", label: "Search", icon: Search, path: "/?search=true" },
    { id: "orders", label: "Orders", icon: Package, path: "/orders" },
    { id: "account", label: "Account", icon: User, path: "/account" },
  ];

  return (
    <nav className="fixed bottom-3 left-0 right-0 z-40 px-4 pointer-events-none">
      <div className="max-w-xs mx-auto bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-full px-3 py-1.5 shadow-2xl flex items-center justify-around pointer-events-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path || (item.id === "home" && currentPath === "/");

          return (
            <Link
              key={item.id}
              href={item.path}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-full transition-all duration-200 active:scale-90 ${
                isActive ? "text-amber-400 font-extrabold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "stroke-[2.5px] scale-110" : "stroke-2"}`} />
              <span className="text-[9px] mt-0.5 tracking-tight font-extrabold">{item.label}</span>

              {/* Active Indicator Pulse Dot */}
              {isActive && (
                <span className="absolute -bottom-0.5 w-1 h-1 bg-amber-400 rounded-full animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
