import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { DeliveryScooterComposition } from "./DeliveryScooterComposition";

const Player = dynamic(
  () => import("@remotion/player").then((mod) => mod.Player),
  { ssr: false }
);

export default function RemotionDeliveryBadge({ etaMinutes = 7, riderName = "Tariq Ahmad" }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-20 bg-emerald-50 rounded-2xl animate-pulse border border-emerald-200" />
    );
  }

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-sm">
      <Player
        component={DeliveryScooterComposition}
        inputProps={{ etaMinutes, riderName }}
        durationInFrames={90}
        fps={30}
        compositionWidth={400}
        compositionHeight={80}
        loop
        autoPlay
        style={{
          width: "100%",
          height: "80px"
        }}
      />
    </div>
  );
}
