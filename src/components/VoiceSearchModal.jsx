import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Sparkles, AlertCircle, ArrowRight, Search, ShieldCheck } from "lucide-react";
import { hapticMedium, hapticLight } from "../lib/haptics";

const POPULAR_VOICE_TAGS = ["Milk", "Chips", "Lavas Bread", "Atta", "Coke", "Butter", "Eggs", "Maggi"];

export default function VoiceSearchModal({ isOpen, onClose, onResult }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [requiresPermission, setRequiresPermission] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");
  const submitTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Stop any active speech recognition and clear timers
  const stopListening = useCallback(() => {
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
      submitTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const submitSearch = useCallback(
    (queryText) => {
      const clean = (queryText || "").trim();
      if (!clean) return;
      hapticMedium();
      stopListening();
      if (onResult) onResult(clean);
      onClose();
    },
    [onResult, onClose, stopListening]
  );

  // Start speech recognition session
  const startListening = useCallback(async () => {
    stopListening();
    setErrorMessage("");
    setRequiresPermission(false);
    transcriptRef.current = "";
    setTranscript("");

    // 1. Android Native Voice Search Bridge (MainActivity JavascriptInterface)
    if (typeof window !== "undefined" && window.AndroidSpeech && window.AndroidSpeech.isAvailable()) {
      setIsListening(true);
      hapticLight();

      window.onNativeSpeechResult = (data) => {
        setIsListening(false);
        const text = data?.text || "";
        if (text) {
          setTranscript(text);
          transcriptRef.current = text;
          hapticMedium();
          submitTimeoutRef.current = setTimeout(() => {
            submitSearch(text);
          }, 450);
        }
      };

      window.onNativeSpeechError = (err) => {
        setIsListening(false);
        const msg = err?.message || "Could not recognize voice. Tap mic to retry.";
        setErrorMessage(msg);
      };

      try {
        window.AndroidSpeech.startListening();
      } catch (e) {
        setIsListening(false);
        setErrorMessage("Failed to start voice search. Tap mic to retry.");
      }
      return;
    }

    // 2. Web Speech API (Chrome, Edge, Android Web, Safari 14.5+)
    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setIsListening(false);
      setErrorMessage("Voice recognition is not directly supported in this browser. Use your keyboard mic (🎙️) below or choose a suggestion.");
      setTimeout(() => inputRef.current?.focus(), 150);
      return;
    }

    setSpeechSupported(true);

    try {
      const recognition = new SpeechRecognition();
      // Resilient language detection with Indian English priority
      recognition.lang =
        (typeof navigator !== "undefined" && (navigator.language || "en-IN")) || "en-IN";
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage("");
        hapticLight();
      };

      recognition.onresult = (event) => {
        let fullTranscript = "";
        let isFinal = false;

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res && res[0]) {
            fullTranscript += res[0].transcript;
            if (res.isFinal) isFinal = true;
          }
        }

        const trimmed = fullTranscript.trim();
        if (trimmed) {
          setTranscript(trimmed);
          transcriptRef.current = trimmed;
        }

        // When the recognition engine marks speech final, schedule auto-submit
        if (isFinal && trimmed) {
          if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current);
          submitTimeoutRef.current = setTimeout(() => {
            submitSearch(trimmed);
          }, 600);
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        const err = event.error;

        if (err === "not-allowed" || err === "service-not-allowed") {
          setRequiresPermission(true);
          setErrorMessage("Microphone permission needed for voice search.");
        } else if (err === "no-speech") {
          setErrorMessage("No voice detected. Tap the mic and speak clearly.");
        } else if (err === "network") {
          setErrorMessage("Network issue connecting to speech recognition service.");
        } else {
          setErrorMessage("Voice not recognized. Tap mic to retry.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        // If we collected a transcript and it hasn't submitted yet, submit now
        if (transcriptRef.current && !submitTimeoutRef.current) {
          submitTimeoutRef.current = setTimeout(() => {
            submitSearch(transcriptRef.current);
          }, 500);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("SpeechRecognition start error:", err);
      setIsListening(false);
      setErrorMessage("Could not start voice search. Tap mic to retry.");
    }
  }, [stopListening, submitSearch]);

  // Explicitly prompt user for microphone permission via getUserMedia
  const handleRequestPermission = async () => {
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Close tracks immediately after permission is granted
        stream.getTracks().forEach((track) => track.stop());
        setRequiresPermission(false);
        setErrorMessage("");
        startListening();
      }
    } catch (err) {
      setErrorMessage("Microphone access was blocked. Please enable it in browser/app settings.");
    }
  };

  // When modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setTranscript("");
      setErrorMessage("");
      setRequiresPermission(false);
      setCustomInput("");
      return;
    }

    startListening();

    return () => {
      stopListening();
      if (typeof window !== "undefined") {
        delete window.onNativeSpeechResult;
        delete window.onNativeSpeechError;
      }
    };
  }, [isOpen, startListening, stopListening]);

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
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    isListening ? "bg-[#FF5B00]" : "bg-slate-500"
                  }`}
                />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-slate-300 dark:text-content-faint">
                DASHit Voice Search
              </span>
            </div>

            <button
              onClick={() => {
                hapticLight();
                onClose();
              }}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition-colors dark:text-content-faint cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Animated Glowing Mic Circle */}
          <div className="flex flex-col items-center justify-center py-2 space-y-4">
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
                onClick={isListening ? stopListening : startListening}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-[0_12px_32px_rgba(255,91,0,0.35)] cursor-pointer ${
                  isListening
                    ? "bg-gradient-to-tr from-[#FF5B00] to-[#FF8A3D] text-white"
                    : "bg-white/10 text-slate-400 border border-white/10 hover:bg-white/15 dark:text-content-faint"
                }`}
                aria-label={isListening ? "Stop listening" : "Start listening"}
              >
                {isListening ? (
                  <Mic className="w-9 h-9 stroke-[2.5] animate-pulse" />
                ) : (
                  <MicOff className="w-8 h-8 stroke-[2]" />
                )}
              </motion.button>
            </div>

            <div className="text-center space-y-1.5 max-w-xs">
              <h3 className="text-base font-black text-white tracking-tight">
                {isListening
                  ? "Listening... Speak now"
                  : transcript
                  ? "Voice Recognized"
                  : errorMessage
                  ? "Voice input paused"
                  : "Tap mic to speak"}
              </h3>
              <p className="text-xs font-semibold text-slate-300 min-h-[20px] px-2 dark:text-content-secondary">
                {transcript ? (
                  <span className="text-[#FF8A3D] text-sm font-bold">"{transcript}"</span>
                ) : (
                  errorMessage || "Try saying: \"Amul Milk\", \"Lay's chips\", or \"Bread\""
                )}
              </p>
            </div>

            {/* If user needs to grant permission */}
            {requiresPermission && (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="mt-1 flex items-center space-x-2 bg-[#FF5B00] hover:bg-[#E04E00] text-white text-xs font-black px-4 py-2 rounded-full transition-all active:scale-95 shadow-md cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Grant Mic Access</span>
              </button>
            )}

            {/* Instant Action Button if transcript captured */}
            {transcript && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                type="button"
                onClick={() => submitSearch(transcript)}
                className="flex items-center space-x-2 bg-gradient-to-r from-[#FF5B00] to-[#FF7A29] hover:brightness-110 text-white text-xs font-black px-5 py-2.5 rounded-full transition-all active:scale-95 shadow-lg cursor-pointer"
              >
                <span>Search for "{transcript}"</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            )}

            {/* Fallback keyboard input if browser doesn't support Web Speech */}
            {!speechSupported && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (customInput.trim()) submitSearch(customInput);
                }}
                className="w-full mt-2 flex items-center space-x-2"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Dictate or type search here..."
                    className="w-full bg-white/10 text-white placeholder-slate-400 pl-9 pr-3 py-2 rounded-xl text-xs font-semibold border border-white/15 focus:outline-none focus:border-[#FF5B00]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!customInput.trim()}
                  className="bg-[#FF5B00] disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-xl"
                >
                  Search
                </button>
              </form>
            )}
          </div>

          {/* Quick Voice Suggestion Chips */}
          <div className="pt-2 border-t border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center dark:text-content-faint">
              Or tap to search directly
            </span>
            <div className="flex flex-wrap justify-center gap-1.5">
              {POPULAR_VOICE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    hapticLight();
                    submitSearch(tag);
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
