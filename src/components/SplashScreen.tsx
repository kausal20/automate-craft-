"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export function SplashScreen() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Simulating initial load duration on hard refresh
    const timer = setTimeout(() => setShow(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-[#111111]"
        >
          <div className="relative flex items-center justify-center animate-pulse">
            <Image
              src="/logo-new.png"
              alt="Loading..."
              width={64}
              height={64}
              className="object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"
              priority
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
