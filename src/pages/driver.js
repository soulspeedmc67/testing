import { useState, useEffect } from "react";
import io from "socket.io-client";
import Link from "next/link";
import { Navigation, Play, Square, MapPin, KeyRound, CheckCircle2, Home, LayoutDashboard } from "lucide-react";

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
      alert("Delivery verified with 4-digit OTP! Order marked completed.");
    } else {
      alert("Please enter a valid 4-digit Customer Delivery OTP!");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 font-sans max-w-md mx-auto space-y-5 antialiased">
      {/* Top Header with Portal Navigation */}
      <header className="space-y-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center justify-between text-xs bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
          <span className="text-zinc-400 font-medium">Navigation:</span>
          <div className="flex items-center space-x-3">
            <Link href="/" className="text-orange-400 font-semibold hover:underline flex items-center space-x-1">
              <Home className="w-3.5 h-3.5" />
              <span>Customer App</span>
            </Link>
            <Link href="/admin" className="text-sky-400 font-semibold hover:underline flex items-center space-x-1">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Admin Panel</span>
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Navigation className="w-5 h-5 text-orange-500" />
            <h1 className="font-bold text-lg text-white">
              <span className="text-orange-500">DASH</span><span className="text-sky-400">it</span> Rider App
            </h1>
          </div>
          <span className="text-xs bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded text-orange-400 font-semibold">
            ID: #ANG-102
          </span>
        </div>
      </header>

      {/* Active Delivery Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">Assigned Delivery</span>
          <span className="text-xs font-bold text-orange-400">Earn ₹30</span>
        </div>

        <div>
          <h3 className="font-bold text-md text-white">Order #{orderId}</h3>
          <p className="text-xs text-zinc-400 mt-0.5">3 items • Prepaid UPI</p>
        </div>

        <div className="bg-zinc-950 p-3 rounded-lg text-xs space-y-1 border border-zinc-800">
          <div className="flex items-start space-x-2">
            <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-zinc-200">Customer Delivery Address:</p>
              <p className="text-zinc-400">Main Market Road, Near Khannabal, Anantnag (192101)</p>
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
                : "bg-orange-500 text-zinc-950 hover:bg-orange-400"
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

        {/* Delivery OTP Verification Modal */}
        {!isDelivered && (
          <div className="pt-2 border-t border-zinc-800 space-y-2">
            <label className="text-xs font-semibold text-sky-400 flex items-center space-x-1">
              <KeyRound className="w-4 h-4 text-orange-500" />
              <span>Enter Customer 4-Digit Delivery OTP:</span>
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                maxLength={4}
                placeholder="OTP..."
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-center font-mono text-lg tracking-widest text-orange-500 py-2 rounded-lg grow"
              />
              <button
                onClick={verifyOtpAndDeliver}
                className="bg-orange-500 text-zinc-950 font-bold text-xs px-4 rounded-lg hover:bg-orange-400 transition-colors"
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
            <p className="text-[10px] text-zinc-500 font-mono mt-1">
              Anantnag Coordinates: {coords.latitude.toFixed(4)}° N, {coords.longitude.toFixed(4)}° E
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
