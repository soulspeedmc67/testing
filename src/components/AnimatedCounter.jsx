import { useEffect, useState } from "react";
import { useMotionValue, useSpring, motion } from "framer-motion";

export default function AnimatedCounter({ value, prefix = "", suffix = "" }) {
  const motionVal = useMotionValue(value);
  const springVal = useSpring(motionVal, { stiffness: 220, damping: 22 });
  const [displayNumber, setDisplayNumber] = useState(value);

  useEffect(() => {
    motionVal.set(value);
  }, [value, motionVal]);

  useEffect(() => {
    const unsubscribe = springVal.on("change", (latest) => {
      setDisplayNumber(Math.round(latest));
    });
    return () => unsubscribe();
  }, [springVal]);

  return (
    <motion.span className="inline-block tabular-nums">
      {prefix}{displayNumber}{suffix}
    </motion.span>
  );
}
