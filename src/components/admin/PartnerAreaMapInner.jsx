import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * The map under the pin: the owner pans it until the pin is on the partner's
 * shop, and the orange circle (his delivery distance) follows. The shop's own
 * area is drawn faintly in blue, for reference.
 *
 * Moves made by the map's own code (searching, "my location", fitting the
 * circle) are not reported back as the owner's, so the position the parent
 * holds is only ever one the owner chose.
 */
function Bridge({ pos, radiusKm, onPos }) {
  const map = useMap();
  const programmatic = useRef(false);
  const settle = () => {
    programmatic.current = true;
    // moveend may never fire (nothing moved); don't swallow the owner's next drag.
    setTimeout(() => { programmatic.current = false; }, 700);
  };

  useEffect(() => {
    map.invalidateSize();
    const t = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(t);
  }, [map]);

  // A position that did not come from this map (a search result, "my location").
  useEffect(() => {
    if (!pos) return;
    const c = map.getCenter();
    if (Math.hypot(c.lat - pos.lat, c.lng - pos.lng) < 1e-6) return;
    try {
      settle();
      map.setView([pos.lat, pos.lng], Math.max(map.getZoom(), 12), { animate: true });
    } catch (e) {
      // not ready yet
    }
  }, [map, pos?.lat, pos?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show the whole circle whenever the distance changes (not on the first draw,
  // when the sheet holding the map may not have a size yet).
  const firstRadius = useRef(true);
  useEffect(() => {
    if (firstRadius.current) {
      firstRadius.current = false;
      return;
    }
    if (!pos || !radiusKm) return;
    try {
      map.invalidateSize();
      settle();
      // The circle's box worked out by hand: a circle not yet on the map can't measure itself.
      const dLat = radiusKm / 111.32;
      const dLng = radiusKm / (111.32 * Math.max(0.2, Math.cos((pos.lat * Math.PI) / 180)));
      map.fitBounds(L.latLngBounds([pos.lat - dLat, pos.lng - dLng], [pos.lat + dLat, pos.lng + dLng]), { padding: [28, 28], animate: true });
    } catch (e) {
      // The map isn't ready to move yet; the next change will.
    }
  }, [radiusKm]); // eslint-disable-line react-hooks/exhaustive-deps

  useMapEvents({
    moveend: (e) => {
      if (programmatic.current) {
        programmatic.current = false;
        return;
      }
      const c = e.target.getCenter();
      onPos({ lat: Math.round(c.lat * 1e6) / 1e6, lng: Math.round(c.lng * 1e6) / 1e6 });
    },
  });
  return null;
}

export default function PartnerAreaMapInner({ pos, radiusKm, onPos, shop }) {
  const start = pos || (shop ? { lat: shop.lat, lng: shop.lng } : { lat: 33.73, lng: 75.15 });
  return (
    <MapContainer
      center={[start.lat, start.lng]}
      zoom={pos ? 12 : 10}
      style={{ height: "100%", width: "100%" }}
      zoomControl={true}
      scrollWheelZoom={true}
      inertia={true}
      fadeAnimation={false}
    >
      <TileLayer
        attribution="&copy; Google Maps"
        url="https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        subdomains={["0", "1", "2", "3"]}
        maxZoom={20}
      />
      {shop && shop.km > 0 && (
        <Circle
          center={[shop.lat, shop.lng]}
          radius={shop.km * 1000}
          pathOptions={{ color: "#2563EB", fillColor: "#2563EB", fillOpacity: 0.04, weight: 2, dashArray: "4, 8" }}
        />
      )}
      {pos && radiusKm > 0 && (
        <Circle
          center={[pos.lat, pos.lng]}
          radius={radiusKm * 1000}
          pathOptions={{ color: "#FF5B00", fillColor: "#FF5B00", fillOpacity: 0.14, weight: 2.5 }}
        />
      )}
      <Bridge pos={pos} radiusKm={radiusKm} onPos={onPos} />
    </MapContainer>
  );
}
