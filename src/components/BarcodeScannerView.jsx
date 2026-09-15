import { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  X,
  Zap,
  ZapOff,
  RefreshCw,
  Search,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

/**
 * High-pitched crisp scanner beep (880Hz).
 */
function playBeepSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {}
}

export default function BarcodeScannerView({
  onDetected,
  onClose,
  continuous = false,
  title = "Scan Product Barcode",
  darkMode = false,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const isScanningRef = useRef(true);
  const lastScannedCodeRef = useRef("");
  const lastScannedTimeRef = useRef(0);

  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [facingMode, setFacingMode] = useState("environment"); // back camera
  const [manualCode, setManualCode] = useState("");
  const [detectedBadge, setDetectedBadge] = useState(null);

  // 1. Initialise BarcodeDetector if available
  useEffect(() => {
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        detectorRef.current = new window.BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
        });
      } catch (e) {
        console.warn("BarcodeDetector init error:", e);
      }
    }
  }, []);

  // 2. Start Camera Stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        setCameraError("Camera access is not supported on this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check if torch/flashlight is supported
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() || {};
      setHasTorch(Boolean(capabilities.torch));
      setHasCamera(true);
    } catch (err) {
      console.warn("Camera access error:", err);
      setCameraError("Unable to access camera. You can type or paste the barcode manually below.");
      setHasCamera(false);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [startCamera]);

  // 3. Scan frame loop using native BarcodeDetector
  useEffect(() => {
    let animationFrameId;
    isScanningRef.current = true;

    const scanFrame = async () => {
      if (!isScanningRef.current) return;

      const video = videoRef.current;
      if (video && video.readyState >= 2 && detectorRef.current) {
        try {
          const barcodes = await detectorRef.current.detect(video);
          if (barcodes && barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            const now = Date.now();

            // Debounce same code in continuous mode
            if (
              code &&
              (code !== lastScannedCodeRef.current || now - lastScannedTimeRef.current > 1800)
            ) {
              lastScannedCodeRef.current = code;
              lastScannedTimeRef.current = now;

              // Sound and haptics
              playBeepSound();
              if (navigator.vibrate) navigator.vibrate([80]);

              setDetectedBadge(code);
              setTimeout(() => setDetectedBadge(null), 1200);

              if (onDetected) onDetected(code);

              if (!continuous) {
                isScanningRef.current = false;
                return;
              }
            }
          }
        } catch (err) {
          // Ignore frame detection hiccups
        }
      }

      if (isScanningRef.current) {
        animationFrameId = setTimeout(scanFrame, 120);
      }
    };

    scanFrame();

    return () => {
      isScanningRef.current = false;
      if (animationFrameId) clearTimeout(animationFrameId);
    };
  }, [continuous, onDetected]);

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        await track.applyConstraints({
          advanced: [{ torch: !isTorchOn }],
        });
        setIsTorchOn(!isTorchOn);
      } catch (e) {
        console.warn("Failed to toggle torch", e);
      }
    }
  };

  // Flip Camera
  const flipCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Submit Manual Barcode
  const handleManualSubmit = (e) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;
    playBeepSound();
    if (navigator.vibrate) navigator.vibrate([50]);
    if (onDetected) onDetected(clean);
    setManualCode("");
    if (!continuous && onClose) onClose();
  };

  const QUICK_SAMPLE_BARCODES = [
    { label: "Maggi 4-Pack", code: "8901058852331" },
    { label: "Amul Milk 1L", code: "8901262010015" },
    { label: "Amul Butter 100g", code: "8901262010053" },
    { label: "Lay's Masala", code: "8901491101837" },
    { label: "Tata Salt 1kg", code: "8901725131015" },
    { label: "Coca-Cola 750ml", code: "8901764012211" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border transition-colors ${
          darkMode ? "bg-[#12141A] border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF5B00]/15 text-[#FF5B00] flex items-center justify-center font-black">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm">{title}</h3>
              <p className="text-[11px] opacity-70">
                {continuous ? "Rapid Batch Inward Active" : "Point camera at packaging barcode"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="relative bg-black aspect-[4/3] w-full overflow-hidden flex items-center justify-center">
          {hasCamera ? (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Target Reticle */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
                <div className="relative w-64 h-40 border-2 border-dashed border-emerald-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] flex items-center justify-center">
                  {/* Corner Marks */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                  {/* Animated Laser Scanning Line */}
                  <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10B981] animate-pulse" />
                </div>
              </div>

              {/* Scanned Badge Popup */}
              {detectedBadge && (
                <div className="absolute top-4 bg-emerald-500 text-slate-950 font-mono font-black text-xs px-4 py-2 rounded-full shadow-xl flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Detected: {detectedBadge}</span>
                </div>
              )}

              {/* Camera Controls Overlay */}
              <div className="absolute bottom-3 left-0 right-0 px-4 flex items-center justify-between pointer-events-auto">
                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className="bg-black/60 backdrop-blur-md text-white p-2.5 rounded-xl border border-white/20 hover:bg-black/80 transition-all text-xs flex items-center space-x-1 font-bold"
                  >
                    {isTorchOn ? <ZapOff className="w-4 h-4 text-amber-400" /> : <Zap className="w-4 h-4" />}
                    <span>Torch</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={flipCamera}
                  className="bg-black/60 backdrop-blur-md text-white p-2.5 rounded-xl border border-white/20 hover:bg-black/80 transition-all text-xs flex items-center space-x-1 font-bold ml-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Flip</span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-center p-6 space-y-2 text-slate-300">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-xs font-semibold">{cameraError || "Camera not active"}</p>
              <button
                type="button"
                onClick={startCamera}
                className="bg-[#FF5B00] text-white text-xs font-bold px-4 py-2 rounded-xl mt-2 cursor-pointer"
              >
                Retry Camera
              </button>
            </div>
          )}
        </div>

        {/* Manual Barcode Entry + Quick Barcode Presets */}
        <div className="p-4 sm:p-5 space-y-3">
          <form onSubmit={handleManualSubmit} className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Type or paste barcode (e.g. 8901058852331)..."
                className={`w-full text-xs font-mono pl-9 pr-3 py-2.5 rounded-xl border transition-all outline-none ${
                  darkMode
                    ? "bg-[#1A1D26] border-zinc-700 text-white placeholder:text-zinc-500 focus:border-[#FF5B00]"
                    : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF5B00]"
                }`}
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="bg-[#FF5B00] hover:bg-[#E04E00] disabled:opacity-50 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap"
            >
              Lookup
            </button>
          </form>

          {/* Quick Demo Test Barcodes */}
          <div className="pt-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-1.5">
              1-Tap Test Samples (Kashmir & Indian Grocery):
            </span>
            <div className="flex items-center flex-wrap gap-1.5">
              {QUICK_SAMPLE_BARCODES.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    playBeepSound();
                    if (navigator.vibrate) navigator.vibrate([50]);
                    if (onDetected) onDetected(item.code);
                    if (!continuous && onClose) onClose();
                  }}
                  className={`text-[10.5px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    darkMode
                      ? "bg-[#1A1D26] border-zinc-700 text-zinc-300 hover:border-[#FF5B00] hover:text-white"
                      : "bg-slate-100 border-slate-200 text-slate-700 hover:border-[#FF5B00] hover:text-[#FF5B00]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
