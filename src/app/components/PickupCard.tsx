"use client";

import Image from "next/image";
import { formatDateJST, formatDateRangeJST } from "@/lib/date-utils";

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

interface PickupCardProps {
  event: Event;
  sourceConfig?: SourceConfig;
  variant?: 'today' | 'soon' | 'week';
}

// DQ-style variant styles
const variantStyles = {
  today: {
    container: 'bg-gradient-to-b from-red-900/80 to-red-950/90 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]',
    dateBg: 'bg-red-900/50 border-red-500/50',
    dateText: 'text-red-300',
    dateSubText: 'text-red-400/80',
    titleText: 'text-white',
    tagBg: 'bg-red-900/50 text-red-300 border-red-500/30',
    arrowText: 'text-red-300',
    badge: 'TODAY!',
    badgeClass: 'dq-badge-today',
  },
  soon: {
    container: 'bg-gradient-to-b from-amber-900/60 to-amber-950/80 border-amber-500/70',
    dateBg: 'bg-amber-900/50 border-amber-500/50',
    dateText: 'text-amber-300',
    dateSubText: 'text-amber-400/80',
    titleText: 'text-gray-100',
    tagBg: '',
    arrowText: 'text-amber-400',
    badge: 'まもなく',
    badgeClass: 'dq-badge-soon',
  },
  week: {
    container: 'bg-gradient-to-b from-emerald-900/60 to-emerald-950/80 border-emerald-500/70',
    dateBg: 'bg-emerald-900/50 border-emerald-500/50',
    dateText: 'text-emerald-300',
    dateSubText: 'text-emerald-400/80',
    titleText: 'text-gray-100',
    tagBg: '',
    arrowText: 'text-emerald-400',
    badge: '今週',
    badgeClass: 'dq-badge-week',
  },
};

export function PickupCard({ event, sourceConfig, variant = 'week' }: PickupCardProps) {
  const dateInfo = event.eventDate ? formatDateJST(event.eventDate) : null;
  const dateRange = event.eventDate && event.eventEndDate
    ? formatDateRangeJST(event.eventDate, event.eventEndDate)
    : null;
  const styles = variantStyles[variant];

  const defaultConfig: SourceConfig = {
    emoji: '📅',
    label: event.source.name || event.sourceId,
    color: 'text-gray-400',
    bgColor: 'bg-gray-800',
  };

  const config = sourceConfig || defaultConfig;

  return (
    <a
      href={event.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block flex-shrink-0 w-[300px] sm:w-[340px]"
    >
      <div className={`relative h-full rounded border-2 overflow-hidden transition-all duration-300 hover:scale-[1.02] ${event.imageUrl ? 'bg-gray-900' : styles.container}`}>
        {/* Event Image Background */}
        {event.imageUrl && (
          <div className="absolute inset-0">
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              className="object-cover opacity-50 transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 768px) 300px, 340px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
          </div>
        )}

        {/* Badge */}
        <div className="absolute top-3 right-3 z-10">
          <span className={`dq-badge ${event.imageUrl ? styles.badgeClass : styles.badgeClass}`}>
            {styles.badge}
          </span>
        </div>

        <div className="relative z-10 p-5 flex flex-col h-full min-h-[180px]">
          {/* Date display */}
          {dateInfo && (
            <div className={`inline-flex w-fit items-center gap-2 px-3 py-1.5 rounded border mb-3 ${event.imageUrl ? 'bg-black/50 border-white/20' : styles.dateBg}`}>
              {dateRange ? (
                <span className={`text-xl font-bold ${event.imageUrl ? 'text-white' : styles.dateText}`}>
                  {dateRange.range}
                </span>
              ) : (
                <>
                  <span className={`text-2xl font-bold ${event.imageUrl ? 'text-white' : styles.dateText}`}>
                    {dateInfo.month}/{dateInfo.day}
                  </span>
                  <span className={`text-sm ${event.imageUrl ? 'text-white/70' : styles.dateSubText}`}>
                    ({dateInfo.weekday})
                  </span>
                </>
              )}
            </div>
          )}

          {/* Title */}
          <h3 className={`text-base sm:text-lg font-bold leading-snug line-clamp-3 mb-3 flex-grow ${event.imageUrl ? 'text-white' : styles.titleText}`}>
            {event.title}
          </h3>

          {/* Source tag */}
          <div className="flex items-center justify-between mt-auto">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded border text-xs font-medium ${
              event.imageUrl ? 'bg-black/50 text-white border-white/20' : variant === 'today' ? styles.tagBg : `${config.bgColor} ${config.color} border-current/20`
            }`}>
              <span>{config.emoji}</span>
              {config.label}
            </span>

            {/* Arrow */}
            <span className={`flex items-center gap-1 text-sm opacity-60 group-hover:opacity-100 transition-all group-hover:translate-x-1 ${event.imageUrl ? 'text-white' : styles.arrowText}`}>
              詳細
              <span className="text-amber-400">▶</span>
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}
