"use client";

interface Event {
  id: string;
  title: string;
  url: string;
  eventDate: Date | null;
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

// Format date for display
function formatEventDate(date: Date): { month: number; day: number; weekday: string; full: string } {
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return {
    month: date.getMonth() + 1,
    day: date.getDate(),
    weekday: weekdays[date.getDay()] ?? '',
    full: `${date.getMonth() + 1}月${date.getDate()}日(${weekdays[date.getDay()]})`,
  };
}

// Check event status
function getEventStatus(eventDate: Date | null): 'today' | 'soon' | 'upcoming' | null {
  if (!eventDate) return null;

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const eventDay = new Date(eventDate);
  eventDay.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((eventDay.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays > 0 && diffDays <= 3) return 'soon';
  if (diffDays > 0 && diffDays <= 7) return 'upcoming';
  return null;
}

export function EventCard({ event, index, sourceConfig }: EventCardProps) {
  const dateInfo = event.eventDate ? formatEventDate(event.eventDate) : null;
  const status = getEventStatus(event.eventDate);

  const defaultConfig: SourceConfig = {
    emoji: '📅',
    label: event.source.name || event.sourceId,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
  };

  const config = sourceConfig || defaultConfig;

  return (
    <a
      href={event.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <div className="bg-white rounded-[20px] shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_2px_4px_rgba(0,0,0,0.05),0_12px_24px_rgba(0,0,0,0.05)] transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:translate-y-[-8px] hover:scale-[1.02] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_8px_16px_rgba(0,0,0,0.1),0_32px_64px_rgba(0,0,0,0.1)] h-full overflow-hidden">
        {/* Top accent bar */}
        <div className={`h-1 ${config.bgColor.replace('bg-', 'bg-gradient-to-r from-').replace('-50', '-400')} to-transparent`} />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            {/* Date or Icon */}
            {dateInfo ? (
              <div className={`flex-shrink-0 w-16 h-16 rounded-2xl ${config.bgColor} flex flex-col items-center justify-center transition-transform group-hover:scale-105`}>
                <span className="text-xs text-gray-500">{dateInfo.month}月</span>
                <span className={`text-2xl font-bold ${config.color}`}>{dateInfo.day}</span>
                <span className="text-xs text-gray-500">({dateInfo.weekday})</span>
              </div>
            ) : (
              <div className={`flex-shrink-0 w-16 h-16 rounded-2xl ${config.bgColor} flex items-center justify-center text-3xl transition-transform group-hover:scale-105`}>
                {config.emoji}
              </div>
            )}

            {/* Status badge */}
            {status && (
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                status === 'today'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white animate-pulse'
                  : status === 'soon'
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-900'
                    : 'bg-gradient-to-r from-emerald-400 to-green-400 text-emerald-900'
              }`}>
                {status === 'today' ? '今日!' : status === 'soon' ? 'まもなく' : '今週'}
              </div>
            )}
          </div>

          {/* Title */}
          <h3 className="text-base font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-amber-600 transition-colors mb-3">
            {event.title}
          </h3>

          {/* Source tag */}
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
              <span>{config.emoji}</span>
              {config.label}
            </span>

            {/* Arrow icon */}
            <span className="flex items-center gap-1 text-sm text-gray-400 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
              詳細
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}
