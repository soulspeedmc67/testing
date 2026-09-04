import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Sparkles, AlertCircle } from "lucide-react";
import { hapticMedium, hapticLight } from "../lib/haptics";

export default function VoiceSearchModal({ isOpen, onClose, onResult }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      setTranscript("");
      setErrorMessage("");
      return;
    }

    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRecognition) {
      setErrorMessage("Voice recognition is not supported on this device/browser. Please type your search.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage("");
        hapticLight();
      };

      recognition.onresult = (event) => {
        const currentTranscript = Array.from(event.results)
          .map((res) => res[0].transcript)
          .join("");
        setTranscript(currentTranscript);

        if (event.results[0].isFinal) {
          hapticMedium();
          setTimeout(() => {
            if (onResult) onResult(currentTranscript);
            onClose();
          }, 450);
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === "not-allowed") {
          setErrorMessage("Microphone permission denied. Please enable mic access in device settings.");
        } else if (event.error === "no-speech") {
          setErrorMessage("No speech detected. Please tap the mic and speak clearly.");
        } else {
          setErrorMessage("Could not recognize voice. Tap below to retry.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setErrorMessage("Failed to start voice search. Tap to retry.");
      setIsListening(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [isOpen]);

  const handleRetry = () => {
    setErrorMessage("");
    setTranscript("");
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {}
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center pointer-events-auto select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ y: "100%", opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="relative w-full max-w-md bg-gradient-to-b from-[#08152C] via-[#061124] to-[#040C1A] text-white rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl border border-slate-700/60 z-10 space-y-5 pb-[max(28px,env(safe-area-inset-bottom,28px))]"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2.5 w-2.5">
                {isListening && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF5B00] opacity-75" />
                )}
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF5B00]" />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                Dashit Voice Search
              </span>
            </div>

            <button
              onClick={() => {
                hapticLight();
                onClose();
              }}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Animated Glowing Mic Circle */}
          <div className="flex flex-col items-center justify-center py-4 space-y-4">
            <div className="relative flex items-center justify-center">
              {isListening && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.45, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute w-24 h-24 rounded-full bg-[#FF5B00]/25 border border-[#FF5B00]/40"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                    className="absolute w-24 h-24 rounded-full bg-[#FF5B00]/15"
                  />
                </>
              )}

              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={isListening ? () => recognitionRef.current?.stop() : handleRetry}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-[0_12px_32px_rgba(255, 91, 0,0.35)] ${
                  isListening
                    ? "bg-gradient-to-tr from-[#FF5B00] to-[#FF8A3D] text-white"
                    : "bg-white/10 text-slate-400 border border-white/10"
                }`}
              >
                {isListening ? (
                  <Mic className="w-9 h-9 stroke-[2.5] animate-pulse" />
                ) : (
                  <MicOff className="w-8 h-8 stroke-[2]" />
                )}
              </motion.button>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-white tracking-tight">
                {isListening
                  ? "Listening..."
                  : errorMessage
                  ? "Voice input paused"
                  : "Tap mic to speak"}
              </h3>
              <p className="text-xs font-semibold text-slate-400">
                {transcript
                  ? `"${transcript}"`
                  : errorMessage || "Try saying: \"Amul Milk\", \"Lay's chips\", or \"Bread\""}
              </p>
            </div>
          </div>

          {/* Quick Voice Suggestion Chips */}
          <div className="pt-1 border-t border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
              Or tap to search directly
            </span>
            <div className="flex flex-wrap justify-center gap-1.5">
              {["Milk", "Chips", "Lavas Bread", "Atta", "Coke"].map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    hapticLight();
                    if (onResult) onResult(tag);
                    onClose();
                  }}
                  className="bg-white/10 hover:bg-white/20 active:scale-95 text-slate-200 text-xs font-bold px-3 py-1 rounded-full border border-white/10 transition-all cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
