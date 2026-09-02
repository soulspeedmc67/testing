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
    <nav className="fixed bottom-3 left-0 right-0 z-40 px-4 pointer-events-none">
      <div className="max-w-md mx-auto bg-[#061838]/95 backdrop-blur-xl border border-slate-700/60 rounded-full px-3 py-1.5 shadow-2xl flex items-center justify-around pointer-events-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path || (item.id === "home" && currentPath === "/");

          return (
            <Link
              key={item.id}
              href={item.path}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-full transition-all duration-150 active:scale-90 ${
                isActive ? "text-[#ea580c] font-black" : "text-slate-300 hover:text-white"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "stroke-[2.5px] scale-110" : "stroke-2"}`} />
              <span className="text-[9px] mt-0.5 tracking-tight font-extrabold">{item.label}</span>

              {/* Active Indicator Pulse Dot */}
              {isActive && (
                <span className="absolute -bottom-0.5 w-1 h-1 bg-[#ea580c] rounded-full animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
