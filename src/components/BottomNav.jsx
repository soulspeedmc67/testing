import Link from "next/link";
import { useRouter } from "next/router";
import { Home, LayoutGrid, Search, FileText, User } from "lucide-react";

export default function BottomNav({ cartCount = 0 }) {
  const router = useRouter();
  const currentPath = router.pathname;

  const NAV_ITEMS = [
    { id: "home", label: "Home", icon: Home, path: "/" },
    { id: "categories", label: "Categories", icon: LayoutGrid, path: "/#categories" },
    { id: "search", label: "Search", icon: Search, path: "/?search=true" },
    { id: "orders", label: "Orders", icon: FileText, path: "/orders" },
    { id: "account", label: "Account", icon: User, path: "/account" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 shadow-2xl">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path || (item.id === "home" && currentPath === "/");

          return (
            <Link
              key={item.id}
              href={item.path}
              className={`flex flex-col items-center justify-center py-1 px-2 transition-all duration-150 active:scale-95 ${
                isActive ? "text-[#ea580c] font-black" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : "stroke-[1.8px]"}`} />
              <span className="text-[10px] mt-0.5 font-bold tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
