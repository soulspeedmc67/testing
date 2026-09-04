import { animate } from "animejs";

/**
 * Animate adding an item to the cart by flying a vibrant bubble
 * from the source button into the target floating cart bar.
 */
export function flyToCart(sourceEventOrElement, targetSelector = "#floating-cart-bar", onArrival) {
  if (typeof window === "undefined") return;

  let startX = 0;
  let startY = 0;

  if (sourceEventOrElement && sourceEventOrElement.currentTarget) {
    const rect = sourceEventOrElement.currentTarget.getBoundingClientRect();
    startX = rect.left + rect.width / 2;
    startY = rect.top + rect.height / 2;
  } else if (sourceEventOrElement && sourceEventOrElement.getBoundingClientRect) {
    const rect = sourceEventOrElement.getBoundingClientRect();
    startX = rect.left + rect.width / 2;
    startY = rect.top + rect.height / 2;
  } else if (sourceEventOrElement && sourceEventOrElement.clientX) {
    startX = sourceEventOrElement.clientX;
    startY = sourceEventOrElement.clientY;
  } else {
    startX = window.innerWidth / 2;
    startY = window.innerHeight / 2;
  }

  const targetEl =
    document.querySelector(targetSelector) ||
    document.querySelector("#global-cart-bar-target") ||
    document.body;
  const targetRect = targetEl.getBoundingClientRect();
  const endX = targetRect.left + targetRect.width / 2;
  const endY = targetRect.top + targetRect.height / 2;

  // Create flying particle
  const particle = document.createElement("div");
  particle.className = "dashit-flying-cart-particle";
  particle.style.position = "fixed";
  particle.style.left = `${startX - 12}px`;
  particle.style.top = `${startY - 12}px`;
  particle.style.width = "24px";
  particle.style.height = "24px";
  particle.style.borderRadius = "50%";
  particle.style.background = "linear-gradient(135deg, #FF5B00 0%, #FF8A3D 100%)";
  particle.style.boxShadow = "0 8px 24px rgba(255, 91, 0, 0.6), 0 0 12px rgba(255, 255, 255, 0.8)";
  particle.style.border = "2px solid #FFFFFF";
  particle.style.zIndex = "99999";
  particle.style.pointerEvents = "none";

  document.body.appendChild(particle);

  const deltaX = endX - startX;
  const deltaY = endY - startY;

  // Arc animation using Anime.js
  animate(particle, {
    translateX: [0, deltaX],
    translateY: [0, deltaY],
    scale: [
      { to: 1.4, duration: 150, ease: "outQuad" },
      { to: 0.35, duration: 350, ease: "inQuad" },
    ],
    opacity: [
      { to: 1, duration: 380 },
      { to: 0, duration: 120 },
    ],
    duration: 500,
    ease: "inOutQuad",
    onComplete: () => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }

      // Bump animation on target cart bar
      if (targetEl && targetEl !== document.body) {
        animate(targetEl, {
          scale: [1, 1.08, 0.98, 1],
          duration: 350,
          ease: "outElastic(1, .6)",
        });
      }

      if (typeof onArrival === "function") {
        onArrival();
      }
    },
  });
}

/**
 * Animated counter for numbers and prices
 */
export function animateCounter(element, startVal, endVal, duration = 600, format = (v) => v) {
  if (!element) return;
  const obj = { val: startVal };
  animate(obj, {
    val: endVal,
    duration,
    ease: "outCubic",
    onUpdate: () => {
      element.innerText = format(Math.round(obj.val));
    },
  });
}
