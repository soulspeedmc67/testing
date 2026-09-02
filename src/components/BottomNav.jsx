import Link from "next/link";
import { useRouter } from "next/router";
import { Home, ShoppingBag, User } from "lucide-react";

export default function BottomNav({ cartCount = 0 }) {
  const router = useRouter();
  const currentPath = router.pathname;

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/cart", label: "Cart", icon: ShoppingBag, badge: cartCount },
    { href: "/account", label: "Account", icon: User },
  ];

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      <nav className="bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-full px-6 py-2.5 flex items-center justify-around transition-all">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center space-y-0.5 relative py-1 px-4 rounded-2xl transition-all duration-200 active:scale-95 ${
                isActive ? "text-emerald-700 font-extrabold" : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? "text-emerald-600 scale-110" : "text-slate-400"}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-3 bg-emerald-600 text-white text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
              {isActive && <div className="w-1 h-1 bg-emerald-600 rounded-full mt-0.5 animate-pulse" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
