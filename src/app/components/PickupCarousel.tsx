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
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const scrollStartX = useRef(0);

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

  // Mouse drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!shouldAnimate) return;
    setIsDragging(true);
    setIsPaused(true);
    dragStartX.current = e.clientX;
    scrollStartX.current = wrapperRef.current?.scrollLeft || 0;
  }, [shouldAnimate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !wrapperRef.current) return;
    const diff = dragStartX.current - e.clientX;
    wrapperRef.current.scrollLeft = scrollStartX.current + diff;
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setIsPaused(false);
  }, []);

  // Touch handlers for mobile swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!shouldAnimate) return;
    setIsPaused(true);
    dragStartX.current = e.touches[0]?.clientX || 0;
    scrollStartX.current = wrapperRef.current?.scrollLeft || 0;
  }, [shouldAnimate]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!wrapperRef.current) return;
    const touchX = e.touches[0]?.clientX || 0;
    const diff = dragStartX.current - touchX;
    wrapperRef.current.scrollLeft = scrollStartX.current + diff;
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsPaused(false);
  }, []);

  // Wheel scroll handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!wrapperRef.current || !shouldAnimate) return;
    // Horizontal scroll with wheel
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      wrapperRef.current.scrollLeft += e.deltaX;
      setIsPaused(true);
      // Resume after a short delay
      setTimeout(() => setIsPaused(false), 2000);
    }
  }, [shouldAnimate]);

  // Common wrapper that always has refs attached
  return (
    <div
      ref={wrapperRef}
      className={shouldAnimate ? "marquee-container -mx-4 overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing" : "overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide"}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={() => shouldAnimate && setIsPaused(true)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      <div
        ref={contentRef}
        className={
          shouldAnimate
            ? "flex gap-3 md:gap-4 animate-scroll-left px-4"
            : "flex gap-3 md:gap-4"
        }
        style={shouldAnimate ? {
          animationDuration: `${speed}s`,
          animationPlayState: isPaused ? "paused" : "running"
        } : undefined}
      >
        {children}
        {/* Duplicate for seamless loop when animating */}
        {shouldAnimate && children}
      </div>
    </div>
  );
}
