import { useEffect, useState } from "react";
import io from "socket.io-client";

let socket;

export default function MapTracking({ orderId, initialLat = 28.6139, initialLng = 77.2090 }) {
  const [location, setLocation] = useState({ latitude: initialLat, longitude: initialLng });
  const [driverName, setDriverName] = useState("Delivery Partner");
  const [status, setStatus] = useState("Connecting to live driver GPS...");

  useEffect(() => {
    // Connect to Socket.io server
    socket = io();

    socket.emit("join_order_room", orderId);

    socket.on("driver_location_changed", (data) => {
      console.log("Real-time driver location received:", data);
      setLocation({ latitude: data.latitude, longitude: data.longitude });
      if (data.driverName) setDriverName(data.driverName);
      setStatus("Driver is on the way!");
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [orderId]);

  return (
    <div className="w-full bg-slate-900 text-white rounded-xl p-4 shadow-lg border border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <h3 className="font-semibold text-lg">{driverName}</h3>
        </div>
        <span className="text-xs bg-emerald-950 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-800 font-medium">
          {status}
        </span>
      </div>

      {/* Simulated High-Performance Leaflet Map Box */}
      <div className="relative w-full h-64 bg-slate-800 rounded-lg overflow-hidden flex flex-col items-center justify-center border border-slate-700">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        {/* Animated Rider Marker */}
        <div className="z-10 flex flex-col items-center animate-bounce">
          <div className="bg-emerald-500 text-slate-950 p-2.5 rounded-full shadow-lg font-bold text-xl">
            🛵
          </div>
          <div className="bg-slate-950/80 text-emerald-400 text-xs px-2 py-0.5 rounded shadow mt-1 font-mono">
            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </div>
        </div>

        <div className="absolute bottom-2 left-2 text-[10px] text-slate-400 bg-slate-950/60 px-2 py-1 rounded backdrop-blur">
          Powered by OpenStreetMap + Socket.io (Zero Map Costs)
        </div>
      </div>
    </div>
  );
}
