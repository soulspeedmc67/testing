import { useEffect } from "react";

/**
 * Locks background scrolling while a modal / bottom sheet is open.
 *
 * THE BUG THIS FIXES: the hand-rolled sheets render as `fixed inset-0` overlays
 * on top of a still-scrollable page. Dragging inside the sheet — especially when
 * its own content is short or has no scroll container — chains the gesture
 * through to <body>, so the screen *behind* the sheet scrolls instead. On iOS
 * WebView this is the default behaviour and `overflow: hidden` alone does not
 * stop it.
 *
 * The fix is position-fixing the body at its current offset (which iOS does
 * honour) and restoring the exact scroll position on close, so reopening a sheet
 * never jumps the page to the top.
 *
 * Sheets built on VaulDrawer do NOT need this — vaul does its own locking.
 *
 * @param {boolean} isLocked whether a sheet is currently open
 */
export function useBodyScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked || typeof document === "undefined") return;

    const body = document.body;
    const scrollY = window.scrollY;

    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      overscrollBehavior: body.style.overscrollBehavior,
    };

    /* position:fixed is what actually stops iOS WebView scroll chaining;
       overflow:hidden alone is ignored there. Pinning `top` to the negative
       current offset keeps the page visually still while it is locked.

       `important` is deliberate, not defensive noise: vaul writes
       `body.style.position = "relative"` for its own drawer handling AFTER
       this effect runs, which silently un-did the lock (measured: `top` was
       applied but computed position stayed `relative` and the page still
       scrolled). An important inline value beats vaul's plain inline write. */
    body.style.setProperty("position", "fixed", "important");
    body.style.setProperty("top", `-${scrollY}px`, "important");
    body.style.setProperty("left", "0", "important");
    body.style.setProperty("right", "0", "important");
    body.style.setProperty("width", "100%", "important");
    body.style.setProperty("overflow", "hidden", "important");
    body.style.setProperty("overscroll-behavior", "none", "important");

    return () => {
      for (const prop of ["position", "top", "left", "right", "width", "overflow", "overscroll-behavior"]) {
        body.style.removeProperty(prop);
      }
      // Put back anything the page had set inline before we locked it.
      if (previous.position) body.style.position = previous.position;
      if (previous.top) body.style.top = previous.top;
      if (previous.left) body.style.left = previous.left;
      if (previous.right) body.style.right = previous.right;
      if (previous.width) body.style.width = previous.width;
      if (previous.overflow) body.style.overflow = previous.overflow;
      if (previous.overscrollBehavior) body.style.overscrollBehavior = previous.overscrollBehavior;
      // Restore where the user actually was, not the top of the page.
      window.scrollTo(0, scrollY);
    };
  }, [isLocked]);
}

export default useBodyScrollLock;
