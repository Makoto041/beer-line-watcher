"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useEffect } from "react";
import { Icon, SourceIcon } from "./Icon";

interface Source {
  id: string;
  name: string | null;
}

interface SourceConfig {
  icon: string;
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
    router.replace(queryString ? `/?${queryString}` : '/', { scroll: false });
  };

  // Restore scroll position after render
  useEffect(() => {
    const savedPosition = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    if (scrollContainerRef.current && savedPosition) {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = Number(savedPosition);
        }
      });
    }
  }, [currentSource]);

  const totalCount = Object.values(sourceCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="card p-4">
      {/* Label */}
      <div className="flex items-center gap-2 mb-3">
        <Icon name="caret" className="w-3 h-3 text-[var(--text-muted)]" />
        <span className="text-xs md:text-sm font-medium text-[var(--text-secondary)]">ソースで絞り込み</span>
      </div>

      {/* Tabs */}
      <div ref={scrollContainerRef} className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
        <div className="flex gap-2 min-w-max">
          {/* All sources */}
          <button
            onClick={() => handleSourceChange('')}
            className={`group relative inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-150 whitespace-nowrap ${
              !currentSource
                ? 'bg-[var(--bg-tertiary)] border border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'bg-transparent border border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span>すべて</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] md:text-xs ${
              !currentSource ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
            }`}>
              {totalCount}
            </span>
          </button>

          {/* New arrivals */}
          {newArrivalsCount > 0 && (
            <button
              onClick={() => handleSourceChange('new')}
              className={`group relative inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                currentSource === 'new'
                  ? 'bg-[var(--bg-tertiary)] border border-emerald-500 text-emerald-400'
                  : 'bg-transparent border border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon name="star" className="w-3 h-3" />
              <span>新着</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] md:text-xs ${
                currentSource === 'new' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-900/30 text-emerald-400'
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
                className={`group relative inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? 'bg-[var(--bg-tertiary)] border border-[var(--accent-primary)] text-[var(--accent-primary)]'
                    : 'bg-transparent border border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <SourceIcon sourceId={source.id} className="w-4 h-4" />
                <span className="hidden sm:inline">{config?.label || source.name || source.id}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] md:text-xs ${
                  isActive ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
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
