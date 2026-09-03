import { useState } from "react";
import { motion } from "framer-motion";

export default function ShimmerImage({ src, alt = "", className = "", imgClassName = "" }) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 animate-shimmer rounded-2xl" />
      )}
      <motion.img
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className={`w-full h-full object-contain ${imgClassName}`}
      />
    </div>
  );
}
