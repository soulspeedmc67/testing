import * as React from "react";
import { cn } from "../../lib/utils";

const badgeVariants = {
  default: "bg-slate-900 text-white",
  secondary: "bg-slate-100 text-slate-800",
  /* Semantic, NOT brand: success stays green so it reads as confirmation
     rather than as another Dashit-orange call to action. */
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
  warning: "bg-amber-50 text-amber-900 border border-amber-200/80",
  destructive: "bg-rose-50 text-rose-700 border border-rose-200/80",
  outline: "text-slate-800 border border-slate-200"
};

function Badge({ className, variant = "default", ...props }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-tight transition-colors",
        badgeVariants[variant] || badgeVariants.default,
        className
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
