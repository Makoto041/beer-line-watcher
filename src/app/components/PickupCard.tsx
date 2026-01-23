"use client";

import Image from "next/image";
import { formatDateJST, formatDateRangeJST } from "@/lib/date-utils";
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

interface PickupCardProps {
  event: Event;
  sourceConfig?: SourceConfig;
  variant?: 'today' | 'soon' | 'week';
}

// Simplified variant styles using border colors only
const variantStyles = {
  today: {
    borderColor: 'border-red-500/70',
    badge: '今日',
    badgeClass: 'badge-today',
  },
  soon: {
    borderColor: 'border-amber-500/50',
    badge: 'まもなく',
    badgeClass: 'badge-soon',
  },
  week: {
    borderColor: 'border-emerald-500/50',
    badge: '今週',
    badgeClass: 'badge-week',
  },
};

export function PickupCard({ event, sourceConfig, variant = 'week' }: PickupCardProps) {
  const dateInfo = event.eventDate ? formatDateJST(event.eventDate) : null;
  const dateRange = event.eventDate && event.eventEndDate
    ? formatDateRangeJST(event.eventDate, event.eventEndDate)
    : null;
  const styles = variantStyles[variant];

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
      className="group block flex-shrink-0 w-[300px] sm:w-[340px]"
    >
      <div className={`relative h-full rounded-lg border bg-[var(--bg-secondary)] overflow-hidden transition-all duration-200 hover:bg-[var(--bg-tertiary)] ${styles.borderColor}`}>
        {/* Event Image Background */}
        {event.imageUrl && (
          <div className="absolute inset-0">
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              className="object-cover opacity-40 transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 300px, 340px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-secondary)] via-[var(--bg-secondary)]/60 to-transparent" />
          </div>
        )}

        {/* Badge */}
        <div className="absolute top-3 right-3 z-10">
          <span className={`badge ${styles.badgeClass}`}>
            {styles.badge}
          </span>
        </div>

        <div className="relative z-10 p-5 flex flex-col h-full min-h-[180px]">
          {/* Date display */}
          {dateInfo && (
            <div className="inline-flex w-fit items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] mb-3">
              {dateRange ? (
                <span className="text-xl font-bold text-amber-400">
                  {dateRange.range}
                </span>
              ) : (
                <>
                  <span className="text-2xl font-bold text-amber-400">
                    {dateInfo.month}/{dateInfo.day}
                  </span>
                  <span className="text-sm text-[var(--text-muted)]">
                    ({dateInfo.weekday})
                  </span>
                </>
              )}
            </div>
          )}

          {/* Title */}
          <h3 className="text-base sm:text-lg font-semibold leading-snug line-clamp-3 mb-3 flex-grow text-[var(--text-primary)] group-hover:text-amber-400 transition-colors">
            {event.title}
          </h3>

          {/* Source tag */}
          <div className="flex items-center justify-between mt-auto">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-muted)]">
              <SourceIcon sourceId={event.sourceId} className="w-3 h-3" />
              {config.label}
            </span>

            {/* Arrow */}
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
