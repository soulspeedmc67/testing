import { useEffect } from "react";

let activeLocks = 0;
let originalStyles = null;
let savedScrollY = 0;

/**
 * Locks background scrolling while a modal / bottom sheet is open.
 * Uses reference counting so multiple or overlapping sheets do not
 * overwrite previous styles or leave the page permanently frozen.
 * Avoids position:fixed on body which causes viewport jumps on mobile.
 */
export function lockBodyScroll() {
  if (typeof document === "undefined") return;
  const body = document.body;
  const html = document.documentElement;

  if (activeLocks === 0) {
    originalStyles = {
      bodyOverflow: body.style.overflow || "",
      htmlOverflow: html.style.overflow || "",
      bodyOverscroll: body.style.overscrollBehavior || "",
      htmlOverscroll: html.style.overscrollBehavior || "",
      touchAction: body.style.touchAction || "",
    };

    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    html.style.overscrollBehavior = "none";
    body.style.touchAction = "pan-y";
  }
  activeLocks++;
}

export function unlockBodyScroll() {
  if (typeof document === "undefined") return;
  if (activeLocks <= 0) {
    activeLocks = 0;
    return;
  }

  activeLocks--;

  if (activeLocks === 0) {
    const body = document.body;
    const html = document.documentElement;

    if (originalStyles) {
      body.style.overflow = originalStyles.bodyOverflow;
      html.style.overflow = originalStyles.htmlOverflow;
      body.style.overscrollBehavior = originalStyles.bodyOverscroll;
      html.style.overscrollBehavior = originalStyles.htmlOverscroll;
      body.style.touchAction = originalStyles.touchAction;
      originalStyles = null;
    } else {
      body.style.removeProperty("overflow");
      html.style.removeProperty("overflow");
      body.style.removeProperty("overscroll-behavior");
      html.style.removeProperty("overscroll-behavior");
      body.style.removeProperty("touch-action");
    }
  }
}

/**
 * Emergency unlock: immediately restores native body scrolling and
 * clears any stuck lock counters. Safe to call on route changes.
 */
export function forceUnlockBodyScroll() {
  if (typeof document === "undefined") return;
  activeLocks = 0;
  originalStyles = null;
  const body = document.body;
  const html = document.documentElement;
  body.style.removeProperty("overflow");
  html.style.removeProperty("overflow");
  body.style.removeProperty("overscroll-behavior");
  html.style.removeProperty("overscroll-behavior");
  body.style.removeProperty("touch-action");
  body.style.removeProperty("position");
  body.style.removeProperty("top");
  body.style.removeProperty("left");
  body.style.removeProperty("right");
  body.style.removeProperty("width");
}

export function useBodyScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [isLocked]);
}

export default useBodyScrollLock;

