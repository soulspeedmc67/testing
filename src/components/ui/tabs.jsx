import * as React from "react";
import { cn } from "../../lib/utils";

function Tabs({ value, onValueChange, className, children }) {
  return (
    <div className={cn("space-y-3", className)}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child, { activeValue: value, onSelectValue: onValueChange });
      })}
    </div>
  );
}

function TabsList({ className, children, activeValue, onSelectValue }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl overflow-x-auto scrollbar-none",
        className
      )}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child, {
          isActive: child.props.value === activeValue,
          onClick: () => onSelectValue && onSelectValue(child.props.value)
        });
      })}
    </div>
  );
}

function TabsTrigger({ className, children, isActive, onClick, value, ...props }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-black transition-all duration-200 active:scale-95",
        isActive
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-500 hover:text-slate-900",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function TabsContent({ value, activeValue, className, children }) {
  if (value !== activeValue) return null;
  return <div className={cn("mt-2", className)}>{children}</div>;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
