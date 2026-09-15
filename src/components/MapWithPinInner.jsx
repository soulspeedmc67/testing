import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMapEvents, useMap, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Single bridge between the Leaflet instance and React state.
 *
 * Two bugs used to make this map feel broken, both fixed here:
 *
 * 1. DOUBLE PANNING — a custom `touchmove` handler called `map.panBy()` on every
 *    move while Leaflet's own `dragging` was also enabled, so the map travelled
 *    roughly twice the distance of the finger and stuttered. Leaflet's native
 *    drag (with inertia) is now the only pan handler.
 *
 * 2. FEEDBACK LOOP — `moveend` pushed the new centre up to React, the parent fed
 *    it back down as `pos`, and the recentre effect called `setView()`, which
 *    fired `moveend` again. The map fought the user mid-gesture. We now track
 *    what we last emitted and whether a move was programmatic, and skip the
 *    recentre when the position originated from the map itself.
 */
function MapBridge({ pos, onChangePos, onDragStateChange, mapRef }) {
  const map = useMap();
  const lastEmitted = useRef(null);
  const isProgrammatic = useRef(false);
  const isUserDragging = useRef(false);

  useEffect(() => {
    if (!map) return;
    if (mapRef) mapRef.current = map;

    // Leaflet mis-measures inside sheets/modals that animate open
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map, mapRef]);

  // Recentre only for positions that did NOT come from this map
  useEffect(() => {
    if (!map || !pos?.lat || !pos?.lng) return;
    if (isUserDragging.current) return;

    const last = lastEmitted.current;
    if (last && Math.abs(last.lat - pos.lat) < 1e-6 && Math.abs(last.lng - pos.lng) < 1e-6) {
      return; // echo of our own emit
    }

    const centre = map.getCenter();
    if (Math.hypot(centre.lat - pos.lat, centre.lng - pos.lng) < 1e-5) return;

    isProgrammatic.current = true;
    map.setView([pos.lat, pos.lng], map.getZoom(), { animate: true });
  }, [map, pos?.lat, pos?.lng]);

  const emit = (latlng) => {
    lastEmitted.current = { lat: latlng.lat, lng: latlng.lng };
    if (onChangePos) onChangePos({ lat: latlng.lat, lng: latlng.lng });
  };

  useMapEvents({
    dragstart: () => {
      isUserDragging.current = true;
      if (onDragStateChange) onDragStateChange(true);
    },
    /* `moveend` covers drags, flicks with inertia, zooms and setView alike, so
       it is the only place we report — `dragend` would double-report. */
    moveend: (e) => {
      isUserDragging.current = false;
      if (isProgrammatic.current) {
        isProgrammatic.current = false;
        if (onDragStateChange) onDragStateChange(false);
        return;
      }
      emit(e.target.getCenter());
      if (onDragStateChange) onDragStateChange(false);
    },
    click: (e) => emit(e.latlng),
  });

  return null;
}

export default function MapWithPinInner({ pos, onChangePos, onDragStateChange, mapRef }) {
  return (
    <MapContainer
      center={[pos.lat, pos.lng]}
      zoom={16}
      style={{ height: "100%", width: "100%" }}
      zoomControl={false}
      touchZoom={true}
      dragging={true}
      inertia={true}
      inertiaDeceleration={2600}
      zoomAnimation={true}
      fadeAnimation={false}
      scrollWheelZoom={true}
      doubleClickZoom={true}
    >
      <TileLayer
        attribution='&copy; Google Maps'
        url="https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        subdomains={["0", "1", "2", "3"]}
        maxZoom={20}
        keepBuffer={6}
        updateWhenIdle={false}
      />
      {/* 5.0 KM STRICT DELIVERY BOUNDARY CIRCLE */}
      <Circle
        center={[33.735832, 75.143614]}
        radius={5000}
        pathOptions={{
          color: "#FF5B00",
          fillColor: "#FF5B00",
          fillOpacity: 0.05,
          weight: 2,
          dashArray: "6, 8",
        }}
      />
      <MapBridge
        pos={pos}
        onChangePos={onChangePos}
        onDragStateChange={onDragStateChange}
        mapRef={mapRef}
      />
    </MapContainer>
  );
}
