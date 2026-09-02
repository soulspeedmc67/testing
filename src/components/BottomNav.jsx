import Link from "next/link";
import { useRouter } from "next/router";
import { Home, LayoutGrid, Search, FileText, User } from "lucide-react";

export default function BottomNav({ cartCount = 0 }) {
  const router = useRouter();
  const currentPath = router.pathname;

  const NAV_ITEMS = [
    { id: "home", label: "Home", icon: Home, path: "/" },
    { id: "categories", label: "Categories", icon: LayoutGrid, path: "/categories" },
    { id: "search", label: "Search", icon: Search, path: "/search" },
    { id: "orders", label: "Orders", icon: FileText, path: "/orders" },
    { id: "account", label: "Account", icon: User, path: "/account" },
  ];

  return (
    <div className="floating-pill-nav">
      <nav className="max-w-xs mx-auto bg-[#061838]/95 backdrop-blur-2xl border-2 border-slate-700/80 rounded-full px-3.5 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.5)] ring-2 ring-white/10 flex items-center justify-around pointer-events-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path || (item.id === "home" && currentPath === "/");

          return (
            <Link
              key={item.id}
              href={item.path}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-full transition-all duration-150 active:scale-90 ${
                isActive ? "text-[#f97316] font-black bg-white/10" : "text-slate-300 hover:text-white"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "stroke-[2.5px] scale-110 text-[#f97316]" : "stroke-2"}`} />
              <span className="text-[9px] mt-0.5 font-extrabold tracking-tight">{item.label}</span>

              {/* Active Pulse Dot Indicator */}
              {isActive && (
                <span className="absolute -bottom-1 w-1.5 h-1 bg-[#f97316] rounded-full animate-pulse shadow-sm" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
