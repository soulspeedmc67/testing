import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { DARK_STORE_HUB } from "../../lib/deliveryEta";
import { riderMapIcon } from "./riderMapIcon";

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

/** Frames the store and every rider when the set of riders on the map changes, not on every GPS write. */
function FitToRiders({ riders }) {
  const map = useMap();
  const who = riders.map((r) => r.id).join(",");

  useEffect(() => {
    const points = [[DARK_STORE_HUB.lat, DARK_STORE_HUB.lng], ...riders.map((r) => [r.lat, r.lng])];
    map.invalidateSize();
    if (points.length === 1) map.setView(points[0], 14);
    else map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, who]);

  return null;
}

function RiderMarker({ rider }) {
  const icon = useMemo(() => riderMapIcon(rider.name, rider.live), [rider.name, rider.live]);
  return <Marker position={[rider.lat, rider.lng]} icon={icon} interactive={false} zIndexOffset={500} />;
}

/** The store and every rider whose phone has said where it is. `riders`: [{ id, name, lat, lng, live }]. */
export default function RidersMap({ riders = [] }) {
  return (
    <MapContainer
      center={[DARK_STORE_HUB.lat, DARK_STORE_HUB.lng]}
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
      <Marker position={[DARK_STORE_HUB.lat, DARK_STORE_HUB.lng]} icon={storeIcon} interactive={false} />
      {riders.map((rider) => (
        <RiderMarker key={rider.id} rider={rider} />
      ))}
      <FitToRiders riders={riders} />
    </MapContainer>
  );
}
