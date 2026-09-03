import { useEffect } from "react";
import { MapContainer, TileLayer, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function MapController({ pos, mapRef }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (mapRef) {
      mapRef.current = map;
    }

    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map, mapRef]);

  useEffect(() => {
    if (map && pos && pos.lat && pos.lng) {
      const current = map.getCenter();
      const dist = Math.hypot(current.lat - pos.lat, current.lng - pos.lng);
      if (dist > 0.0001) {
        map.setView([pos.lat, pos.lng], map.getZoom(), { animate: true });
      }
    }
  }, [map, pos?.lat, pos?.lng]);

  return null;
}

// Native Touch Pan Handler ensuring 100% fluid dragging on Android WebView
function MapTouchPanHandler({ onChangePos, onDragStateChange }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();
    if (!container) return;

    let startX = 0;
    let startY = 0;
    let isTouching = false;
    let hasMoved = false;

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        isTouching = true;
        hasMoved = false;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e) => {
      if (!isTouching || e.touches.length !== 1) return;
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const dx = currentX - startX;
      const dy = currentY - startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        if (!hasMoved) {
          hasMoved = true;
          if (onDragStateChange) onDragStateChange(true);
        }
        startX = currentX;
        startY = currentY;
        map.panBy([-dx, -dy], { animate: false });
      }
    };

    const onTouchEnd = () => {
      if (isTouching) {
        isTouching = false;
        if (hasMoved) {
          const center = map.getCenter();
          if (onChangePos) onChangePos({ lat: center.lat, lng: center.lng });
          if (onDragStateChange) onDragStateChange(false);
        }
      }
    };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("touchend", onTouchEnd, { passive: true });
    container.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [map, onChangePos, onDragStateChange]);

  return null;
}

function MapEventsHandler({ onChangePos, onDragStateChange }) {
  useMapEvents({
    dragstart: () => {
      if (onDragStateChange) onDragStateChange(true);
    },
    movestart: () => {
      if (onDragStateChange) onDragStateChange(true);
    },
    dragend: (e) => {
      const center = e.target.getCenter();
      onChangePos({ lat: center.lat, lng: center.lng });
      if (onDragStateChange) onDragStateChange(false);
    },
    moveend: (e) => {
      const center = e.target.getCenter();
      onChangePos({ lat: center.lat, lng: center.lng });
      if (onDragStateChange) onDragStateChange(false);
    },
    click: (e) => {
      onChangePos({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
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
      scrollWheelZoom={true}
      doubleClickZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <MapController pos={pos} mapRef={mapRef} />
      <MapTouchPanHandler onChangePos={onChangePos} onDragStateChange={onDragStateChange} />
      <MapEventsHandler onChangePos={onChangePos} onDragStateChange={onDragStateChange} />
    </MapContainer>
  );
}
