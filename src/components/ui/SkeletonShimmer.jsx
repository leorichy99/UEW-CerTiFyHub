import { motion } from "framer-motion";

/**
 * SkeletonShimmer — a Framer-animated pulse block used during silent refreshes.
 * Wrap data fields in <AnimatePresence> with this component cross-faded against
 * the real content for a smooth, layout-stable refresh experience.
 */
export default function SkeletonShimmer({
  width = "100%",
  height = 16,
  rounded = 8,
  className = "",
  style = {},
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`relative overflow-hidden bg-slate-200/80 ${className}`}
      style={{
        width,
        height,
        borderRadius: rounded,
        ...style,
      }}
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)",
        }}
        animate={{ x: ["-100%", "100%"] }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </motion.div>
  );
}
