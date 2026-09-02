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
    <div className="fixed bottom-3 left-6 right-6 z-50 max-w-xs mx-auto animate-slide-up">
      <nav className="bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-2xl rounded-full px-5 py-1.5 flex items-center justify-around h-12 transition-all">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center relative py-0.5 px-3 rounded-full transition-all duration-200 active:scale-90 ${
                isActive ? "text-[#0c831f] font-extrabold" : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <div className="relative">
                <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? "text-[#0c831f] scale-110" : "text-slate-400"}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-[#0c831f] text-white text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white shadow-sm">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-extrabold tracking-tight mt-0.5">{item.label}</span>
              {isActive && <div className="w-1 h-1 bg-[#0c831f] rounded-full mt-0.5 animate-pulse" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
