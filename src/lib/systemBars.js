import { StatusBar, Style } from "@capacitor/status-bar";

/**
 * Dynamically synchronizes top status bar and bottom navigation bar colors across Android & iOS.
 * @param {Object} options
 * @param {string} options.topColor - Hex color for the status bar (e.g. '#8B1A1A' or '#FFE8D6')
 * @param {boolean} options.topDarkIcons - True if icons on the status bar should be dark (e.g. for light backgrounds)
 * @param {string} options.bottomColor - Hex color for the navigation bar (e.g. '#FFFDF5' or '#FFFFFF')
 * @param {boolean} options.bottomDarkIcons - True if icons on the nav bar should be dark
 */
export async function setDeviceSystemBars({
  topColor = "#FFFDF5",
  topDarkIcons = true,
  bottomColor = "#FFFDF5",
  bottomDarkIcons = true,
}) {
  if (typeof window === "undefined") return;

  // 1. Web meta theme-color (for mobile browsers / PWA / iOS Webview)
  try {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", topColor);
  } catch (e) {}

  // 2. Capacitor Official StatusBar plugin (iOS + Android)
  try {
    await StatusBar.setBackgroundColor({ color: topColor });
    await StatusBar.setStyle({
      style: topDarkIcons ? Style.Light : Style.Dark,
    });
  } catch (e) {}

  // 3. Android Native Bridge for both top and bottom system bars
  try {
    if (window.AndroidBars && typeof window.AndroidBars.setBars === "function") {
      window.AndroidBars.setBars(topColor, topDarkIcons, bottomColor, bottomDarkIcons);
    }
  } catch (e) {}
}
