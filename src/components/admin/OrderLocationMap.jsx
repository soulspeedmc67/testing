import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { DARK_STORE_HUB, MAX_DELIVERY_RADIUS_KM } from "../../lib/deliveryEta";

const storeIcon = L.divIcon({
  className: "order-map-store",
  html: `
    <div style="width:34px; height:34px; border-radius:10px; background:#061838; border:2px solid #ffffff; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 8px rgba(0,0,0,0.35);">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/>
      </svg>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const doorIcon = L.divIcon({
  className: "order-map-door",
  html: `
    <svg width="34" height="46" viewBox="0 0 38 52" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 4px 8px rgba(0,0,0,0.4));">
      <path d="M19 0C8.5 0 0 8.5 0 19C0 32.5 19 46 19 46C19 46 38 32.5 38 19C38 8.5 29.5 0 19 0Z" fill="#FF5B00"/>
      <circle cx="19" cy="19" r="14.5" fill="#ffffff"/>
      <circle cx="19" cy="19" r="11.5" fill="#FF5B00"/>
      <path d="M19 12L12.5 17.5V24H16.5V20H21.5V24H25.5V17.5L19 12Z" fill="#ffffff"/>
    </svg>
  `,
  iconSize: [34, 46],
  iconAnchor: [17, 41],
});

/** Keeps the store and the door both in view, also after the drawer has slid in. */
function FitToPoints({ points }) {
  const map = useMap();

  useEffect(() => {
    const fit = () => {
      map.invalidateSize();
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
    };
    fit();
    const timer = setTimeout(fit, 300);
    return () => clearTimeout(timer);
  }, [map, points]);

  return null;
}

/**
 * Where one order goes: the store, the customer's pin, the straight line the
 * distance is measured along, and the usual 8 km area.
 */
export default function OrderLocationMap({ lat, lng }) {
  const points = useMemo(
    () => [
      [DARK_STORE_HUB.lat, DARK_STORE_HUB.lng],
      [lat, lng],
    ],
    [lat, lng]
  );

  return (
    <MapContainer
      center={points[1]}
      zoom={14}
      zoomControl={true}
      attributionControl={false}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; Google Maps"
        url="https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        subdomains={["0", "1", "2", "3"]}
        maxZoom={20}
      />
      <Circle
        center={points[0]}
        radius={MAX_DELIVERY_RADIUS_KM * 1000}
        pathOptions={{ color: "#FF5B00", fillColor: "#FF5B00", fillOpacity: 0.04, weight: 1.5, dashArray: "6, 8" }}
      />
      <Polyline positions={points} pathOptions={{ color: "#061838", weight: 3, dashArray: "2, 8", lineCap: "round" }} />
      <Marker position={points[0]} icon={storeIcon} interactive={false} />
      <Marker position={points[1]} icon={doorIcon} interactive={false} />
      <FitToPoints points={points} />
    </MapContainer>
  );
}
