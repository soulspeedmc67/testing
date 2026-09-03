import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { X } from "lucide-react";

export default function DraggableSheet({ isOpen, onClose, title, subtitle, children, maxHeight = "85vh" }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Draggable Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 400) {
                onClose();
              }
            }}
            style={{ maxHeight }}
            className="relative w-full max-w-md bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl border border-slate-100 flex flex-col z-10 overflow-hidden"
          >
            {/* Top Drag Handle Bar */}
            <div className="w-full flex flex-col items-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none select-none">
              <div className="w-10 h-1.5 bg-slate-300 rounded-full" />
            </div>

            {/* Optional Header */}
            {(title || subtitle) && (
              <div className="px-5 py-2.5 flex items-center justify-between border-b border-slate-100 shrink-0">
                <div>
                  {title && <h3 className="font-black text-sm text-slate-900 tracking-tight">{title}</h3>}
                  {subtitle && <p className="text-[11px] text-slate-400 font-medium">{subtitle}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Scrollable Body */}
            <div className="p-5 overflow-y-auto overscroll-contain scrollbar-none flex-1">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
