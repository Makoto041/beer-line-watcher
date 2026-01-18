"use client";

import { useRef, useState, useEffect, useCallback, type ReactNode } from "react";

interface PickupCarouselProps {
  children: ReactNode;
  speed?: number; // seconds for one complete scroll
}

export function PickupCarousel({ children, speed = 30 }: PickupCarouselProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  const checkOverflow = useCallback(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    const contentWidth = content.scrollWidth;
    const wrapperWidth = wrapper.clientWidth;
    setShouldAnimate(contentWidth > wrapperWidth);
  }, []);

  useEffect(() => {
    // Initial check
    checkOverflow();

    // Re-check on resize
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [checkOverflow, children]);

  // Common wrapper that always has refs attached
  return (
    <div
      ref={wrapperRef}
      className={shouldAnimate ? "marquee-container -mx-4" : "overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide"}
    >
      <div
        ref={contentRef}
        className={
          shouldAnimate
            ? "flex gap-3 md:gap-4 animate-scroll-left px-4"
            : "flex gap-3 md:gap-4"
        }
        style={shouldAnimate ? { animationDuration: `${speed}s` } : undefined}
      >
        {children}
        {/* Duplicate for seamless loop when animating */}
        {shouldAnimate && children}
      </div>
    </div>
  );
}
