"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";

interface PickupCarouselProps {
  children: ReactNode;
  speed?: number; // seconds for one complete scroll
}

export function PickupCarousel({ children, speed = 30 }: PickupCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check if content overflows (needs scrolling)
    const checkOverflow = () => {
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
      setShouldAnimate(scrollWidth > clientWidth);
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [children]);

  if (!shouldAnimate) {
    return (
      <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        <div className="flex gap-3 md:gap-4">{children}</div>
      </div>
    );
  }

  return (
    <div className="marquee-container -mx-4">
      <div
        ref={containerRef}
        className="flex gap-3 md:gap-4 animate-scroll-left px-4"
        style={{ animationDuration: `${speed}s` }}
      >
        {children}
        {/* Duplicate for seamless loop */}
        {children}
      </div>
    </div>
  );
}
