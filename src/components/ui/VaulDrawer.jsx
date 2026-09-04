import { Drawer } from "vaul";
import { useBodyScrollLock } from "../../lib/useBodyScrollLock";

export default function VaulDrawer({
  open,
  onOpenChange,
  children,
  title,
  description,
  maxHeight = "max-h-[88vh]"
}) {
  /* vaul is supposed to lock background scroll itself, but measured against
     this app it does not — with a drawer open the page behind still scrolled
     (body stayed `position: relative`). Locking explicitly here fixes every
     VaulDrawer-based sheet at once (address picker, quick view, etc.). */
  useBodyScrollLock(Boolean(open));

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-slate-950/50 z-[60] backdrop-blur-xs transition-opacity duration-300 ease-out" />
        <Drawer.Content
          className={`bg-white flex flex-col rounded-t-[32px] fixed bottom-0 left-0 right-0 z-[60] max-w-md mx-auto border-t border-slate-100 outline-none shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${maxHeight}`}
        >
          {/* Top handle pill */}
          <div className="w-full pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing touch-none select-none">
            <div className="w-12 h-1.5 shrink-0 rounded-full bg-slate-300" />
          </div>

          <div className="p-5 flex-1 overflow-y-auto overscroll-contain">
            {title && (
              <Drawer.Title className="font-black text-sm text-slate-900 tracking-tight">
                {title}
              </Drawer.Title>
            )}
            {description && (
              <Drawer.Description className="text-xs text-slate-400 font-medium mb-3">
                {description}
              </Drawer.Description>
            )}
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
