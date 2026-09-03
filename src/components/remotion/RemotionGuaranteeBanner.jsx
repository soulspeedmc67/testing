import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { StopwatchGuaranteeComposition } from "./StopwatchGuaranteeComposition";

const Player = dynamic(
  () => import("@remotion/player").then((mod) => mod.Player),
  { ssr: false }
);

export default function RemotionGuaranteeBanner() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-14 bg-slate-900 rounded-2xl animate-pulse" />
    );
  }

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-sm">
      <Player
        component={StopwatchGuaranteeComposition}
        durationInFrames={60}
        fps={30}
        compositionWidth={400}
        compositionHeight={56}
        loop
        autoPlay
        style={{
          width: "100%",
          height: "56px"
        }}
      />
    </div>
  );
}
