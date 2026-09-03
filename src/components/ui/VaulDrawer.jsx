import { Drawer } from "vaul";

export default function VaulDrawer({
  open,
  onOpenChange,
  children,
  title,
  description,
  maxHeight = "max-h-[88vh]"
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-slate-950/60 z-[60] backdrop-blur-sm" />
        <Drawer.Content
          className={`bg-white flex flex-col rounded-t-[32px] fixed bottom-0 left-0 right-0 z-[60] max-w-md mx-auto border-t border-slate-100 outline-none shadow-2xl ${maxHeight}`}
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
