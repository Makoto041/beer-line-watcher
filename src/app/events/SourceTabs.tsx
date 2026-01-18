"use client";

import { useRouter, useSearchParams } from "next/navigation";

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
}

export function SourceTabs({ sources, sourceCounts, currentSource, sourceConfig }: SourceTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSourceChange = (sourceId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sourceId) {
      params.set('source', sourceId);
    } else {
      params.delete('source');
    }
    router.push(`/events?${params.toString()}`);
  };

  const totalCount = Object.values(sourceCounts).reduce((a, b) => a + b, 0);

  return (
    <div>
      {/* Label */}
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span className="text-sm font-medium text-gray-600">ソースで絞り込み</span>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {/* All sources */}
        <button
          onClick={() => handleSourceChange('')}
          className={`group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
            !currentSource
              ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/25'
              : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm border border-gray-200'
          }`}
        >
          <span>すべて</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            !currentSource ? 'bg-white/20' : 'bg-gray-100'
          }`}>
            {totalCount}
          </span>
        </button>

        {/* Individual sources */}
        {sources.map((source) => {
          const config = sourceConfig[source.id];
          const isActive = currentSource === source.id;
          const count = sourceCounts[source.id] || 0;

          return (
            <button
              key={source.id}
              onClick={() => handleSourceChange(source.id)}
              className={`group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                isActive
                  ? `${config?.bgColor || 'bg-gray-100'} ${config?.color || 'text-gray-900'} shadow-lg`
                  : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm border border-gray-200'
              }`}
              style={{
                boxShadow: isActive ? `0 10px 40px -10px ${getColorRgba(config?.color)}` : undefined
              }}
            >
              <span className="transition-transform group-hover:scale-110">
                {config?.emoji || '📅'}
              </span>
              <span>{config?.label || source.name || source.id}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                isActive ? 'bg-black/10' : 'bg-gray-100'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Helper to get rgba from Tailwind color class
function getColorRgba(colorClass?: string): string {
  const colorMap: Record<string, string> = {
    'text-amber-600': 'rgba(217, 119, 6, 0.3)',
    'text-purple-600': 'rgba(147, 51, 234, 0.3)',
    'text-rose-600': 'rgba(225, 29, 72, 0.3)',
    'text-sky-600': 'rgba(2, 132, 199, 0.3)',
  };
  return colorMap[colorClass || ''] || 'rgba(0, 0, 0, 0.1)';
}
