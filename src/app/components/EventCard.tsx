"use client";

import Image from "next/image";
import { formatDateJST, formatDateRangeJST, getEventStatusJST } from "@/lib/date-utils";

interface Event {
  id: string;
  title: string;
  url: string;
  imageUrl?: string | null;
  eventDate: Date | null;
  eventEndDate?: Date | null;
  createdAt: Date;
  sourceId: string;
  source: {
    id: string;
    name: string | null;
  };
}

interface SourceConfig {
  emoji: string;
  label: string;
  color: string;
  bgColor: string;
}

interface EventCardProps {
  event: Event;
  index: number;
  sourceConfig?: SourceConfig;
}

export function EventCard({ event, index, sourceConfig }: EventCardProps) {
  const dateInfo = event.eventDate ? formatDateJST(event.eventDate) : null;
  const dateRange = event.eventDate && event.eventEndDate
    ? formatDateRangeJST(event.eventDate, event.eventEndDate)
    : null;
  const status = getEventStatusJST(event.eventDate, event.eventEndDate);

  const defaultConfig: SourceConfig = {
    emoji: '📅',
    label: event.source.name || event.sourceId,
    color: 'text-gray-400',
    bgColor: 'bg-gray-800',
  };

  const config = sourceConfig || defaultConfig;

  // Add special effects for today events
  const isToday = status === 'today';
  const isSoon = status === 'soon';

  return (
    <a
      href={event.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <div className={`dq-card h-full overflow-hidden excitement-shake ${isToday ? 'quest-glow' : ''} ${isSoon ? 'treasure-shine' : ''}`}>
        {/* Event Image or Top accent bar */}
        {event.imageUrl ? (
          <div className="relative w-full h-40 overflow-hidden">
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            {/* Dark overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a0f0a] via-transparent to-transparent" />
            {/* Status badge on image with sparkle */}
            {status && (
              <div className={`absolute top-3 right-3 dq-badge flex items-center gap-1 ${
                status === 'today'
                  ? 'dq-badge-today sparkle'
                  : status === 'soon'
                    ? 'dq-badge-soon'
                    : 'dq-badge-week'
              }`}>
                {status === 'today' && <span className="animate-[sparkle-twinkle_0.8s_ease-in-out_infinite]">✦</span>}
                {status === 'today' ? '今日!' : status === 'soon' ? 'まもなく' : '今週'}
                {status === 'today' && <span className="animate-[sparkle-twinkle_0.8s_ease-in-out_infinite_0.4s]">✦</span>}
              </div>
            )}
            {/* Date overlay on image */}
            {dateInfo && (
              <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded bg-black/70 border border-amber-500/50">
                {dateRange ? (
                  <span className="text-sm font-bold text-amber-400">{dateRange.range}</span>
                ) : (
                  <span className="text-sm font-bold text-amber-400">
                    {dateInfo.month}/{dateInfo.day} ({dateInfo.weekday})
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="h-1 bg-gradient-to-r from-amber-500 to-transparent" />
        )}

        <div className="p-5">
          {/* Header - only show when no image */}
          {!event.imageUrl && (
            <div className="flex items-start justify-between gap-3 mb-4">
              {/* Date or Icon */}
              {dateInfo ? (
                <div className={`flex-shrink-0 ${dateRange ? 'min-w-[4.5rem] px-2' : 'w-16'} h-16 rounded bg-gradient-to-b from-amber-900/50 to-amber-950/50 border border-amber-500/30 flex flex-col items-center justify-center transition-transform group-hover:scale-105`}>
                  {dateRange ? (
                    <>
                      <span className="text-[10px] text-gray-500">開催期間</span>
                      <span className="text-base font-bold text-amber-400 whitespace-nowrap">{dateRange.range}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-gray-500">{dateInfo.month}月</span>
                      <span className="text-2xl font-bold text-amber-400">{dateInfo.day}</span>
                      <span className="text-xs text-gray-500">({dateInfo.weekday})</span>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex-shrink-0 w-16 h-16 rounded bg-gradient-to-b from-amber-900/50 to-amber-950/50 border border-amber-500/30 flex items-center justify-center text-3xl transition-transform group-hover:scale-105">
                  {config.emoji}
                </div>
              )}

              {/* Status badge */}
              {status && (
                <div className={`dq-badge ${
                  status === 'today'
                    ? 'dq-badge-today'
                    : status === 'soon'
                      ? 'dq-badge-soon'
                      : 'dq-badge-week'
                }`}>
                  {status === 'today' ? '今日!' : status === 'soon' ? 'まもなく' : '今週'}
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <h3 className="text-base font-bold text-gray-100 leading-snug line-clamp-2 group-hover:text-amber-400 transition-colors mb-3">
            {event.title}
          </h3>

          {/* Source tag */}
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium ${config.bgColor} ${config.color} border border-current/20`}>
              <span>{config.emoji}</span>
              {config.label}
            </span>

            {/* Arrow icon */}
            <span className="flex items-center gap-1 text-sm text-gray-500 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
              詳細
              <span className="text-amber-400">▶</span>
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}
