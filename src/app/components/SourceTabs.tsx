"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useEffect } from "react";

interface Source {
  id: string;
  name: string | null;
}

interface SourceConfig {
  emoji: string;
  label: string;
  color: string;
  bgColor: string;
}

interface SourceTabsProps {
  sources: Source[];
  sourceCounts: Record<string, number>;
  currentSource: string;
  sourceConfig: Record<string, SourceConfig>;
  newArrivalsCount?: number;
}

const SCROLL_STORAGE_KEY = 'source-tabs-scroll';

export function SourceTabs({ sources, sourceCounts, currentSource, sourceConfig, newArrivalsCount = 0 }: SourceTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Save scroll position before navigation
  const handleSourceChange = (sourceId: string) => {
    // Save current scroll position to sessionStorage
    if (scrollContainerRef.current) {
      sessionStorage.setItem(SCROLL_STORAGE_KEY, String(scrollContainerRef.current.scrollLeft));
    }

    const params = new URLSearchParams(searchParams.toString());
    if (sourceId) {
      params.set('source', sourceId);
    } else {
      params.delete('source');
    }
    const queryString = params.toString();
    // Use replace instead of push to avoid scroll reset
    router.replace(queryString ? `/?${queryString}` : '/', { scroll: false });
  };

  // Restore scroll position after render
  useEffect(() => {
    const savedPosition = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    if (scrollContainerRef.current && savedPosition) {
      // Use requestAnimationFrame to ensure DOM is fully rendered
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = Number(savedPosition);
        }
      });
    }
  }, [currentSource]);

  const totalCount = Object.values(sourceCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="dq-window-beer p-4">
      {/* Label */}
      <div className="flex items-center gap-2 mb-3 md:mb-4">
        <span className="text-amber-400">▶</span>
        <span className="text-xs md:text-sm font-medium text-amber-400">ソースで絞り込み</span>
      </div>

      {/* Tabs - horizontal scroll on mobile */}
      <div ref={scrollContainerRef} className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
        <div className="flex gap-2 min-w-max">
          {/* All sources */}
          <button
            onClick={() => handleSourceChange('')}
            className={`group relative inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              !currentSource
                ? 'dq-tab-active'
                : 'dq-tab'
            }`}
          >
            {!currentSource && <span className="text-amber-400 animate-[dq-blink_0.6s_step-end_infinite]">▶</span>}
            <span>すべて</span>
            <span className={`px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs ${
              !currentSource ? 'bg-amber-500/20 text-amber-300' : 'bg-gray-700/50 text-gray-400'
            }`}>
              {totalCount}
            </span>
          </button>

          {/* New arrivals */}
          {newArrivalsCount > 0 && (
            <button
              onClick={() => handleSourceChange('new')}
              className={`group relative inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                currentSource === 'new'
                  ? 'bg-gradient-to-b from-emerald-800 to-emerald-900 border-2 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'dq-tab'
              }`}
            >
              {currentSource === 'new' && <span className="text-emerald-400 animate-[dq-blink_0.6s_step-end_infinite]">▶</span>}
              <span className="transition-transform group-hover:scale-110">✨</span>
              <span>新着</span>
              <span className={`px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs ${
                currentSource === 'new' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-900/50 text-emerald-400'
              }`}>
                {newArrivalsCount}
              </span>
            </button>
          )}

          {/* Individual sources */}
          {sources.map((source) => {
            const config = sourceConfig[source.id];
            const isActive = currentSource === source.id;
            const count = sourceCounts[source.id] || 0;

            return (
              <button
                key={source.id}
                onClick={() => handleSourceChange(source.id)}
                className={`group relative inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'dq-tab-active'
                    : 'dq-tab'
                }`}
              >
                {isActive && <span className="text-amber-400 animate-[dq-blink_0.6s_step-end_infinite]">▶</span>}
                <span className="transition-transform group-hover:scale-110">
                  {config?.emoji || '📅'}
                </span>
                <span className="hidden sm:inline">{config?.label || source.name || source.id}</span>
                <span className={`px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs ${
                  isActive ? 'bg-amber-500/20 text-amber-300' : 'bg-gray-700/50 text-gray-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
