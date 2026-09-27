import React, { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { calculateBearing, getRiderAssetForHeading, RIDER_ASSETS } from "../../lib/riderAssets";

// Authentic Anantnag Road Route (Lal Chowk Hub -> KP Road Doorstep)
const ANANTNAG_ROUTE_COORDS = [
  [33.735831, 75.143615],
  [33.735549, 75.143378],
  [33.736326, 75.14213],
  [33.736469, 75.141834],
  [33.736801, 75.140695],
  [33.736988, 75.140087],
  [33.737115, 75.139659],
  [33.737181, 75.139437],
  [33.737376, 75.138723],
  [33.737622, 75.137863],
  [33.737722, 75.137507],
  [33.7379, 75.136839],
  [33.738005, 75.13647],
  [33.738131, 75.136116],
  [33.738202, 75.136081],
  [33.738852, 75.135876],
  [33.73895, 75.13592],
  [33.738959, 75.135906],
  [33.738973, 75.135899],
  [33.738988, 75.135898],
  [33.738998, 75.135904],
  [33.73901, 75.135914],
  [33.739015, 75.135928],
  [33.739017, 75.135943],
  [33.739014, 75.135958],
  [33.739006, 75.135972],
  [33.738994, 75.135981],
  [33.73898, 75.135984],
  [33.738964, 75.136061],
  [33.738968, 75.136151],
  [33.738971, 75.136258],
  [33.738977, 75.136399],
  [33.739036, 75.136725],
  [33.739118, 75.137165],
  [33.739125, 75.137299],
  [33.739125, 75.137418],
  [33.739125, 75.137589],
  [33.739067, 75.137989],
  [33.739032, 75.138249],
  [33.738985, 75.138622],
  [33.738945, 75.138936],
  [33.738802, 75.139966],
  [33.738679, 75.141003],
  [33.738592, 75.141726],
  [33.738465, 75.142538],
  [33.738441, 75.142664],
  [33.73838, 75.143056],
  [33.738355, 75.14329],
  [33.738178, 75.144684],
  [33.737999, 75.146084],
  [33.737829, 75.14742],
  [33.737718, 75.148432],
  [33.737573, 75.149537],
  [33.737404, 75.150938],
  [33.737185, 75.152396],
  [33.73696, 75.153738],
  [33.736928, 75.153929],
  [33.736695, 75.155374],
  [33.736474, 75.157089],
  [33.736898, 75.157168],
  [33.73709, 75.157194],
  [33.737503, 75.157117],
  [33.73742, 75.156586],
  [33.737815, 75.156505],
  [33.737951, 75.156607],
  [33.738058, 75.156704],
  [33.738515, 75.156627],
];

/**
 * Clean Store Origin Pin
 */
function createStoreIcon(L) {
  return L.divIcon({
    className: "dashit-store-marker",
    html: `
      <div style="position:relative; display:flex; align-items:center; gap:5px; pointer-events:none;">
        <div style="width:8px; height:8px; border-radius:50%; background:#061838; border:1.5px solid #ffffff; box-shadow:0 1px 3px rgba(0,0,0,0.35);"></div>
        <span style="font-size:11px; font-weight:700; color:#64748b; font-family:'Plus Jakarta Sans',sans-serif; white-space:nowrap; letter-spacing:-0.01em;">Store</span>
      </div>
    `,
    iconSize: [55, 16],
    iconAnchor: [4, 8],
  });
}

/**
 * Clean Destination Pin
 */
function createDestinationIcon(L) {
  return L.divIcon({
    className: "dashit-dest-marker",
    html: `
      <div style="position:relative; display:flex; align-items:center; gap:5px; pointer-events:none;">
        <div style="width:8px; height:8px; border-radius:50%; background:#FF5B00; border:1.5px solid #ffffff; box-shadow:0 1px 5px rgba(255,91,0,0.6);"></div>
        <span style="font-size:11px; font-weight:800; color:#FF5B00; font-family:'Plus Jakarta Sans',sans-serif; white-space:nowrap; letter-spacing:-0.01em;">Your door</span>
      </div>
    `,
    iconSize: [70, 16],
    iconAnchor: [4, 8],
  });
}

/**
 * Official DASHit Driver Marker (3D scooter puck + subtle DASHit crest)
 */
function createDashitRiderIcon(L, riderAsset = RIDER_ASSETS.states.liveMap) {
  return L.divIcon({
    className: "dashit-driver-marker-root",
    html: `
      <div style="position:relative; width:52px; height:52px; display:flex; align-items:center; justify-content:center; pointer-events:none;">
        <!-- Discreet DASHit Driver Badge -->
        <div style="position:absolute; top:-17px; left:50%; transform:translateX(-50%); background:#061838; border:1px solid rgba(255,91,0,0.8); border-radius:9999px; padding:1.5px 6px 1.5px 4px; display:flex; align-items:center; gap:3px; box-shadow:0 2px 6px rgba(0,0,0,0.3); white-space:nowrap; z-index:10;">
          <div style="width:10px; height:10px; border-radius:50%; background:#FF5B00; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <img src="/dashit-dash-orange.png" style="width:7px; height:7px; object-fit:contain; filter:brightness(0) invert(1);" alt="" />
          </div>
          <span style="font-size:9px; font-weight:800; color:#ffffff; font-family:'Plus Jakarta Sans',sans-serif; letter-spacing:0.02em;">Rider</span>
        </div>

        <!-- Radar Pulse Ring -->
        <img src="${RIDER_ASSETS.effects.ripple}" style="position:absolute; width:50px; height:50px; object-fit:contain; opacity:0.85; animation:pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;" alt="" />

        <!-- Ground Contact Shadow -->
        <img src="${RIDER_ASSETS.effects.shadow}" style="position:absolute; bottom:1px; width:38px; height:14px; object-fit:contain; opacity:0.6;" alt="" />

        <!-- 3D Vehicle Sprite -->
        <img src="${riderAsset}" style="width:40px; height:40px; object-fit:contain; filter:drop-shadow(0 4px 10px rgba(0,0,0,0.35)); z-index:5;" alt="DASHit Rider" />
      </div>
    `,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
  });
}

export default function LiveDeliveryMapPreview() {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const progressLineRef = useRef(null);
  const animFrameRef = useRef(null);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    let isMounted = true;

    import("leaflet").then((L) => {
      if (!isMounted || !containerRef.current || mapRef.current) return;

      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });

      const isDarkMode = document.documentElement.classList.contains("dark");

      // Mobile phone optimization: touch scroll never trapped
      const map = L.map(containerRef.current, {
        center: [33.7374, 75.148],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
      });

      // Clean, zero-API-key Google Maps road tiles with dark theme filter
      L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        subdomains: ["0", "1", "2", "3"],
        maxZoom: 20,
        className: "map-tiles-filter",
      }).addTo(map);

      // Road Casing
      L.polyline(ANANTNAG_ROUTE_COORDS, {
        color: isDarkMode ? "#061838" : "#ffffff",
        weight: 7,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // Inactive Route Track
      L.polyline(ANANTNAG_ROUTE_COORDS, {
        color: isDarkMode ? "#1e293b" : "#cbd5e1",
        weight: 3.5,
        opacity: 0.75,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // Active Glowing Neon Orange Path
      const initialCoveredPoints = ANANTNAG_ROUTE_COORDS.slice(
        0,
        Math.max(2, Math.floor(ANANTNAG_ROUTE_COORDS.length * 0.45))
      );
      const activeLine = L.polyline(initialCoveredPoints, {
        color: "#FF5B00",
        weight: 3.5,
        opacity: 1,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // Store Marker (Start)
      L.marker(ANANTNAG_ROUTE_COORDS[0], { icon: createStoreIcon(L) }).addTo(map);

      // Customer Doorstep Marker (Destination)
      L.marker(ANANTNAG_ROUTE_COORDS[ANANTNAG_ROUTE_COORDS.length - 1], {
        icon: createDestinationIcon(L),
      }).addTo(map);

      // Rider Marker
      const startIdx = Math.floor(ANANTNAG_ROUTE_COORDS.length * 0.45);
      const riderMarker = L.marker(ANANTNAG_ROUTE_COORDS[startIdx], {
        icon: createDashitRiderIcon(L, RIDER_ASSETS.directions.east),
        zIndexOffset: 1000,
      }).addTo(map);

      // Frame route cleanly
      const bounds = L.latLngBounds(ANANTNAG_ROUTE_COORDS);
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15.5 });

      mapRef.current = map;
      riderMarkerRef.current = riderMarker;
      progressLineRef.current = activeLine;

      setTimeout(() => {
        if (mapRef.current) mapRef.current.invalidateSize();
      }, 150);
    });

    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Viewport Observer (Preserves phone battery and CPU when not in view)
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisibleRef.current = entry.isIntersecting;
        });
      },
      { threshold: 0.15 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Smooth, Restrained Vehicle Animation Loop
  useEffect(() => {
    let startTime = performance.now();
    const cycleDuration = 18000;

    const step = (time) => {
      if (!isVisibleRef.current) {
        animFrameRef.current = requestAnimationFrame(step);
        return;
      }

      const elapsed = (time - startTime) % cycleDuration;
      let rawP = elapsed / cycleDuration;
      let normP = rawP > 0.88 ? 0.94 : (rawP / 0.88) * 0.9 + 0.05;

      const totalSegments = ANANTNAG_ROUTE_COORDS.length - 1;
      const exactIndex = normP * totalSegments;
      const idxA = Math.floor(exactIndex);
      const idxB = Math.min(idxA + 1, totalSegments);
      const subT = exactIndex - idxA;

      const pA = ANANTNAG_ROUTE_COORDS[idxA];
      const pB = ANANTNAG_ROUTE_COORDS[idxB];

      const curLat = pA[0] + (pB[0] - pA[0]) * subT;
      const curLng = pA[1] + (pB[1] - pA[1]) * subT;

      if (riderMarkerRef.current) {
        riderMarkerRef.current.setLatLng([curLat, curLng]);
      }

      if (progressLineRef.current) {
        const covered = ANANTNAG_ROUTE_COORDS.slice(0, idxB);
        covered.push([curLat, curLng]);
        progressLineRef.current.setLatLngs(covered);
      }

      const bearing = calculateBearing(pA[0], pA[1], pB[0], pB[1]);
      const nextAsset = getRiderAssetForHeading(bearing, true, normP > 0.9);

      import("leaflet").then((L) => {
        if (riderMarkerRef.current && L) {
          riderMarkerRef.current.setIcon(createDashitRiderIcon(L, nextAsset));
        }
      });

      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div className="relative w-full h-[220px] sm:h-[260px] md:h-[280px] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-[#0c1017] select-none">
      {/* Map Surface */}
      <div
        ref={containerRef}
        className="w-full h-full z-0 touch-pan-y pointer-events-none"
      />

      {/* Single Quiet Status Pill */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none select-none">
        <div className="bg-white/95 dark:bg-[#061838]/95 backdrop-blur-md px-3 py-1 rounded-full shadow-xs border border-slate-200/80 dark:border-slate-800 flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF5B00] animate-pulse" />
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Live route • 4 mins away
          </span>
        </div>
      </div>
    </div>
  );
}
