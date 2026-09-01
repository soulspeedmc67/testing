import Link from "next/link";
import { useRouter } from "next/router";
import { Home, ShoppingBag, User, LayoutDashboard, Navigation } from "lucide-react";

export default function BottomNav({ cartCount = 0 }) {
  const router = useRouter();
  const currentPath = router.pathname;

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/cart", label: "Cart", icon: ShoppingBag, badge: cartCount },
    { href: "/account", label: "Account", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#09090b]/95 backdrop-blur-xl border-t border-zinc-800/90 py-2 px-4 shadow-2xl">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center space-y-1 relative py-1 px-3 rounded-xl transition-all ${
                isActive ? "text-orange-500 font-bold" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-orange-500 text-zinc-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-zinc-950">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
