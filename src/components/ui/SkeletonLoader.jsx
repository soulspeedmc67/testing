import { cn } from "../../lib/utils";

/**
 * Base shimmer block. Uses the `animate-shimmer` sweep (neutral slate gradient
 * defined in globals.css) rather than a flat pulse — it reads as "loading"
 * without flashing the whole layout. Every skeleton must match the real
 * element's box exactly so there is zero layout shift on swap-in.
 */
export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-2xl",
        className
      )}
      {...props}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-3 flex flex-col justify-between w-36 sm:w-40 shrink-0 h-64 space-y-2">
      <Skeleton className="w-full h-28 rounded-2xl" />
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-14 rounded-md" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-3 w-20 rounded-md" />
      </div>
      <div className="pt-2 flex items-center justify-between">
        <Skeleton className="h-4 w-12 rounded-md" />
        <Skeleton className="h-7 w-14 rounded-xl" />
      </div>
    </div>
  );
}

export function CategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white border border-slate-200/80 rounded-3xl p-4 h-36 flex flex-col justify-between">
          <div className="space-y-1">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-3 w-14 rounded-md" />
          </div>
          <Skeleton className="w-16 h-16 rounded-2xl self-center" />
        </div>
      ))}
    </div>
  );
}
