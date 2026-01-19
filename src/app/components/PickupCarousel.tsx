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
  const [isInteracting, setIsInteracting] = useState(false);
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
    e.preventDefault();
    setIsInteracting(true);
    setIsPaused(true);
    dragStartX.current = e.clientX;
    scrollStartX.current = wrapperRef.current?.scrollLeft || 0;
  }, [shouldAnimate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isInteracting || !wrapperRef.current) return;
    e.preventDefault();
    const diff = dragStartX.current - e.clientX;
    wrapperRef.current.scrollLeft = scrollStartX.current + diff;
  }, [isInteracting]);

  const handleMouseUp = useCallback(() => {
    setIsInteracting(false);
    setIsPaused(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsInteracting(false);
    setIsPaused(false);
  }, []);

  // Touch handlers for mobile swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!shouldAnimate) return;
    setIsInteracting(true);
    setIsPaused(true);
    dragStartX.current = e.touches[0]?.clientX || 0;
    scrollStartX.current = wrapperRef.current?.scrollLeft || 0;
  }, [shouldAnimate]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isInteracting || !wrapperRef.current) return;
    const touchX = e.touches[0]?.clientX || 0;
    const diff = dragStartX.current - touchX;
    wrapperRef.current.scrollLeft = scrollStartX.current + diff;
  }, [isInteracting]);

  const handleTouchEnd = useCallback(() => {
    setIsInteracting(false);
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

  // When animating, use CSS animation; when interacting, use native scroll
  const useAnimation = shouldAnimate && !isInteracting;

  return (
    <div
      ref={wrapperRef}
      className={`scrollbar-hide ${
        shouldAnimate
          ? "marquee-container overflow-x-auto cursor-grab active:cursor-grabbing"
          : "overflow-x-auto pb-2"
      }`}
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
        className={`flex gap-3 md:gap-4 px-4 ${useAnimation ? "animate-scroll-left" : ""}`}
        style={useAnimation ? {
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
