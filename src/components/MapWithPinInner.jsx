import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function MapEventsHandler({ onChangePos }) {
  useMapEvents({
    moveend: (e) => {
      const center = e.target.getCenter();
      onChangePos({ lat: center.lat, lng: center.lng });
    },
    click: (e) => {
      onChangePos({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
}

export default function MapWithPinInner({ pos, onChangePos }) {
  return (
    <MapContainer
      center={[pos.lat, pos.lng]}
      zoom={16}
      style={{ height: "100%", width: "100%" }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapEventsHandler onChangePos={onChangePos} />
    </MapContainer>
  );
}
