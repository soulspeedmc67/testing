import * as React from "react";
import { cn } from "../../lib/utils";

const buttonVariants = {
  default: "bg-[#FF5B00] text-white hover:bg-[#E04E00] shadow-sm active:scale-[0.97]",
  secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200 active:scale-[0.97]",
  outline: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 active:scale-[0.97]",
  ghost: "hover:bg-slate-100 text-slate-700 active:scale-[0.97]",
  destructive: "bg-rose-500 text-white hover:bg-rose-600 active:scale-[0.97]",
  subtleEmerald: "bg-orange-50 text-[#FF5B00] border border-orange-200/80 hover:bg-orange-100 active:scale-[0.97]",
  frosted: "bg-white/90 backdrop-blur-xl border border-slate-200/90 text-slate-900 shadow-sm hover:bg-white active:scale-[0.97]"
};

const buttonSizes = {
  default: "h-10 px-4 py-2 text-xs",
  sm: "h-8 px-3 text-[11px]",
  lg: "h-12 px-6 text-sm",
  icon: "h-9 w-9 p-0"
};

const Button = React.forwardRef(({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl font-extrabold transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        buttonVariants[variant] || buttonVariants.default,
        buttonSizes[size] || buttonSizes.default,
        className
      )}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };
