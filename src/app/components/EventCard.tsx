"use client";

import Image from "next/image";
import { formatDateJST, formatDateRangeJST, getEventStatusJST, getDaysFromTodayJST } from "@/lib/date-utils";
import { Icon, SourceIcon } from "./Icon";

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
  icon: string;
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
  // Distinguish an ongoing multi-day event (already started, not yet ended)
  // from one starting today.
  const isOngoing =
    status === "today" &&
    !!event.eventEndDate &&
    !!event.eventDate &&
    getDaysFromTodayJST(event.eventDate) < 0;
  const todayLabel = isOngoing ? "開催中" : "今日";

  const defaultConfig: SourceConfig = {
    icon: 'calendar',
    label: event.source.name || event.sourceId,
    color: 'text-[var(--text-muted)]',
    bgColor: 'bg-[var(--bg-tertiary)]',
  };

  const config = sourceConfig || defaultConfig;

  return (
    <a
      href={event.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <div className="card h-full overflow-hidden">
        {/* Event Image or Top accent bar */}
        {event.imageUrl ? (
          <div className="relative w-full h-40 overflow-hidden">
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-secondary)] via-transparent to-transparent" />
            {/* Status badge */}
            {status && (
              <div className={`absolute top-3 right-3 badge ${
                status === 'today'
                  ? 'badge-today'
                  : status === 'soon'
                    ? 'badge-soon'
                    : 'badge-week'
              }`}>
                {status === 'today' ? todayLabel : status === 'soon' ? 'まもなく' : '今週'}
              </div>
            )}
            {/* Date overlay */}
            {dateInfo && (
              <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded bg-black/60 backdrop-blur-sm">
                {dateRange ? (
                  <span className="text-sm font-medium text-[var(--text-primary)]">{dateRange.range}</span>
                ) : (
                  <span className="text-sm font-medium text-[var(--text-primary)]">
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
                <div className={`flex-shrink-0 ${dateRange ? 'min-w-[4.5rem] px-2' : 'w-16'} h-16 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] flex flex-col items-center justify-center transition-transform group-hover:scale-105`}>
                  {dateRange ? (
                    <>
                      <span className="text-[10px] text-[var(--text-muted)]">開催期間</span>
                      <span className="text-base font-bold text-amber-400 whitespace-nowrap">{dateRange.range}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-[var(--text-muted)]">{dateInfo.month}月</span>
                      <span className="text-2xl font-bold text-amber-400">{dateInfo.day}</span>
                      <span className="text-xs text-[var(--text-muted)]">({dateInfo.weekday})</span>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] flex items-center justify-center transition-transform group-hover:scale-105">
                  <SourceIcon sourceId={event.sourceId} className="w-8 h-8 text-[var(--text-muted)]" />
                </div>
              )}

              {/* Status badge */}
              {status && (
                <div className={`badge ${
                  status === 'today'
                    ? 'badge-today'
                    : status === 'soon'
                      ? 'badge-soon'
                      : 'badge-week'
                }`}>
                  {status === 'today' ? todayLabel : status === 'soon' ? 'まもなく' : '今週'}
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <h3 className="text-base font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-amber-400 transition-colors mb-3">
            {event.title}
          </h3>

          {/* Source tag */}
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-muted)]`}>
              <SourceIcon sourceId={event.sourceId} className="w-3 h-3" />
              {config.label}
            </span>

            {/* Arrow icon */}
            <span className="flex items-center gap-1 text-sm text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
              詳細
              <Icon name="caret" className="w-3 h-3 text-amber-400" />
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}
