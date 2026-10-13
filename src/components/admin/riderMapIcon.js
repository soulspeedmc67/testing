import L from "leaflet";

const escapeHtml = (text) =>
  String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/**
 * A rider on the store's maps: a round scooter badge with the rider's name
 * under it. Faded when the rider's phone hasn't been heard from for a while.
 */
export function riderMapIcon(name, live = true) {
  const label = escapeHtml(String(name || "Rider").split(" ")[0]);
  return L.divIcon({
    className: "admin-map-rider",
    html: `
      <div style="display:flex; flex-direction:column; align-items:center; opacity:${live ? 1 : 0.6};">
        <div style="width:36px; height:36px; border-radius:50%; background:${live ? "#7C3AED" : "#64748B"}; border:2px solid #ffffff; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 8px rgba(0,0,0,0.35);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="5.5" cy="17.5" r="2.5"/><circle cx="18.5" cy="17.5" r="2.5"/>
            <path d="M8 17.5h8"/><path d="M15 5h2l2.5 10"/><path d="M5.5 15l3-5H14l1.5 5"/>
          </svg>
        </div>
        <span style="margin-top:2px; padding:1px 6px; border-radius:6px; background:#ffffff; color:#0F172A; font:700 11px/1.4 system-ui,sans-serif; white-space:nowrap; box-shadow:0 1px 3px rgba(0,0,0,0.3);">${label}</span>
      </div>
    `,
    iconSize: [80, 56],
    iconAnchor: [40, 18],
  });
}
