import { useState, useEffect } from "react";
import io from "socket.io-client";
import { Navigation, Play, Square, MapPin, KeyRound, CheckCircle2 } from "lucide-react";

let socket;

export default function DashItDriverApp() {
  const [isTracking, setIsTracking] = useState(false);
  const [orderId, setOrderId] = useState("DASH-98214");
  const [coords, setCoords] = useState({ latitude: 33.7311, longitude: 75.1487 });
  const [statusMsg, setStatusMsg] = useState("Offline");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [isDelivered, setIsDelivered] = useState(false);

  useEffect(() => {
    socket = io();
    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const toggleTracking = () => {
    if (isTracking) {
      setIsTracking(false);
      setStatusMsg("GPS Broadcast Stopped");
    } else {
      setIsTracking(true);
      setStatusMsg("Broadcasting Live GPS in Anantnag...");

      const interval = setInterval(() => {
        setCoords((prev) => {
          const newLat = prev.latitude + 0.0002;
          const newLng = prev.longitude + 0.0002;

          if (socket) {
            socket.emit("update_driver_location", {
              orderId,
              latitude: newLat,
              longitude: newLng,
              heading: 45,
              driverName: "Tariq Scooter Rider (Nai Basti Hub)"
            });
          }
          return { latitude: newLat, longitude: newLng };
        });
      }, 3000);

      return () => clearInterval(interval);
    }
  };

  const verifyOtpAndDeliver = () => {
    if (enteredOtp.length === 4) {
      setIsDelivered(true);
      setIsTracking(false);
      setStatusMsg("Order Delivered Successfully!");
    } else {
      alert("Please enter a valid 4-digit Customer Delivery OTP!");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans max-w-md mx-auto space-y-5">
      {/* Driver Header with DASHit Brand */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Navigation className="w-5 h-5 text-orange-400" />
          <h1 className="font-bold text-lg text-white">
            <span className="text-orange-500">DASH</span><span className="text-sky-400">it</span> Scooter Rider
          </h1>
        </div>
        <span className="text-xs bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-orange-400 font-semibold">
          Rider ID: #ANG-102
        </span>
      </header>

      {/* Active Delivery Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Assigned Order</span>
          <span className="text-xs font-bold text-emerald-400">Earn ₹30</span>
        </div>

        <div>
          <h3 className="font-bold text-md text-white">Order #{orderId}</h3>
          <p className="text-xs text-slate-400 mt-0.5">3 items • Prepaid UPI</p>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg text-xs space-y-1 border border-slate-800">
          <div className="flex items-start space-x-2">
            <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200">Customer Delivery Address:</p>
              <p className="text-slate-400">Main Market Road, Near Khannabal, Anantnag (192101)</p>
            </div>
          </div>
        </div>

        {/* GPS Broadcast Control Button */}
        {!isDelivered ? (
          <button
            onClick={toggleTracking}
            className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
              isTracking
                ? "bg-rose-500 text-white hover:bg-rose-600"
                : "bg-orange-500 text-slate-950 hover:bg-orange-400"
            }`}
          >
            {isTracking ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isTracking ? "STOP GPS BROADCAST" : "START ANANTNAG LIVE GPS TRACKING"}</span>
          </button>
        ) : (
          <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 p-3 rounded-xl text-center text-xs font-bold flex items-center justify-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Order Successfully Delivered!</span>
          </div>
        )}

        {/* Delivery OTP Verification Modal (Rider Enters 4-Digit OTP) */}
        {!isDelivered && (
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <label className="text-xs font-semibold text-sky-300 flex items-center space-x-1">
              <KeyRound className="w-4 h-4 text-orange-400" />
              <span>Enter Customer 4-Digit Delivery OTP:</span>
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                maxLength={4}
                placeholder="OTP..."
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-center font-mono text-lg tracking-widest text-orange-400 py-2 rounded-lg grow"
              />
              <button
                onClick={verifyOtpAndDeliver}
                className="bg-emerald-500 text-slate-950 font-bold text-xs px-4 rounded-lg hover:bg-emerald-400"
              >
                VERIFY & COMPLETE
              </button>
            </div>
          </div>
        )}

        {/* Live Coordinate Monitor */}
        <div className="text-center pt-1">
          <p className="text-[11px] font-mono text-orange-400">{statusMsg}</p>
          {isTracking && (
            <p className="text-[10px] text-slate-500 font-mono mt-1">
              Anantnag Route Coordinates: {coords.latitude.toFixed(4)}° N, {coords.longitude.toFixed(4)}° E
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
