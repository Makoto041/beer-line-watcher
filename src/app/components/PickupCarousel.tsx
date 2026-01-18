"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";

interface PickupCarouselProps {
  children: ReactNode;
  speed?: number; // seconds for one complete scroll
}

export function PickupCarousel({ children, speed = 30 }: PickupCarouselProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    // Check if content overflows (needs scrolling)
    const checkOverflow = () => {
      const contentWidth = content.scrollWidth;
      const wrapperWidth = wrapper.clientWidth;
      setShouldAnimate(contentWidth > wrapperWidth);
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [children]);

  if (shouldAnimate) {
    return (
      <div className="marquee-container -mx-4">
        <div
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

  return (
    <div ref={wrapperRef} className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      <div ref={contentRef} className="flex gap-3 md:gap-4">
        {children}
      </div>
    </div>
  );
}
