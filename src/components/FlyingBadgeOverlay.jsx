import { useState, useEffect } from "react";
import { animate } from "animejs";

let globalTriggerFly = null;

export function triggerFlyToCart(imgUrl, startRect) {
  if (globalTriggerFly) {
    globalTriggerFly(imgUrl, startRect);
  }
}

export default function FlyingBadgeOverlay() {
  useEffect(() => {
    globalTriggerFly = (imgUrl, startRect) => {
      if (typeof window === "undefined") return;

      // 1. Calculate Start Coordinates (where the button was clicked)
      let startX = window.innerWidth / 2;
      let startY = window.innerHeight / 2;

      if (startRect && typeof startRect.left === "number") {
        startX = startRect.left + (startRect.width || 40) / 2;
        startY = startRect.top + (startRect.height || 40) / 2;
      }

      // 2. Calculate Destination Coordinates (center of floating cart bar)
      let endX = window.innerWidth / 2;
      let endY = window.innerHeight - 60;

      const cartBarEl = document.getElementById("global-cart-bar-target");
      if (cartBarEl) {
        const cartRect = cartBarEl.getBoundingClientRect();
        endX = cartRect.left + 24; // land inside left thumbnail circle
        endY = cartRect.top + cartRect.height / 2;
      }

      // 3. Create flying clone DOM element
      const flyer = document.createElement("div");
      flyer.className = "dashit-flying-product-badge";
      flyer.style.position = "fixed";
      flyer.style.left = `${startX - 22}px`;
      flyer.style.top = `${startY - 22}px`;
      flyer.style.width = "44px";
      flyer.style.height = "44px";
      flyer.style.borderRadius = "16px";
      flyer.style.background = "#FFFFFF";
      flyer.style.border = "2.5px solid #061838";
      flyer.style.boxShadow = "0 10px 25px rgba(6, 24, 56, 0.35), 0 0 16px rgba(255, 91, 0, 0.4)";
      flyer.style.overflow = "hidden";
      flyer.style.display = "flex";
      flyer.style.alignItems = "center";
      flyer.style.justifyContent = "center";
      flyer.style.padding = "4px";
      flyer.style.zIndex = "99999";
      flyer.style.pointerEvents = "none";
      flyer.style.transformOrigin = "center center";

      const img = document.createElement("img");
      img.src = imgUrl;
      img.alt = "";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "contain";
      flyer.appendChild(img);

      document.body.appendChild(flyer);

      const deltaX = endX - startX;
      const deltaY = endY - startY;

      // 4. Animate smooth arc trajectory with Anime.js
      animate(flyer, {
        translateX: [0, deltaX],
        translateY: [
          { to: -35, duration: 160, ease: "outQuad" },
          { to: deltaY, duration: 380, ease: "inQuad" },
        ],
        scale: [
          { to: 1.25, duration: 150, ease: "outQuad" },
          { to: 0.45, duration: 390, ease: "inOutQuad" },
        ],
        rotate: [0, -15, 25],
        opacity: [
          { to: 1, duration: 400 },
          { to: 0, duration: 140 },
        ],
        duration: 540,
        ease: "linear",
        onComplete: () => {
          if (flyer.parentNode) {
            flyer.parentNode.removeChild(flyer);
          }

          // Trigger bounce ripple on the View Cart bar
          try {
            window.dispatchEvent(new Event("dashit_cart_bounce"));
          } catch (e) {}

          if (cartBarEl) {
            animate(cartBarEl, {
              scale: [1, 1.07, 0.96, 1],
              duration: 320,
              ease: "outElastic(1, .6)",
            });
          }
        },
      });
    };

    return () => {
      globalTriggerFly = null;
    };
  }, []);

  return null;
}
