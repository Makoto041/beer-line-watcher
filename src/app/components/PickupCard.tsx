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

interface PickupCardProps {
  event: Event;
  sourceConfig?: SourceConfig;
  isToday?: boolean;
}

// Format date for display
function formatEventDate(date: Date): { month: number; day: number; weekday: string } {
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return {
    month: date.getMonth() + 1,
    day: date.getDate(),
    weekday: weekdays[date.getDay()] ?? '',
  };
}

export function PickupCard({ event, sourceConfig, isToday }: PickupCardProps) {
  const dateInfo = event.eventDate ? formatEventDate(event.eventDate) : null;

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
      className="group block flex-shrink-0 w-[280px] sm:w-[320px]"
    >
      <div className={`relative h-full rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
        isToday
          ? 'bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 text-white shadow-lg shadow-orange-500/30'
          : 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 shadow-md'
      }`}>
        {/* Today badge */}
        {isToday && (
          <div className="absolute top-3 right-3">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold animate-pulse">
              TODAY!
            </span>
          </div>
        )}

        <div className="p-5">
          {/* Date display */}
          {dateInfo && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl mb-3 ${
              isToday ? 'bg-white/20' : 'bg-white shadow-sm'
            }`}>
              <span className={`text-2xl font-bold ${isToday ? 'text-white' : 'text-amber-600'}`}>
                {dateInfo.month}/{dateInfo.day}
              </span>
              <span className={`text-sm ${isToday ? 'text-white/80' : 'text-gray-500'}`}>
                ({dateInfo.weekday})
              </span>
            </div>
          )}

          {/* Title */}
          <h3 className={`text-lg font-bold leading-snug line-clamp-2 mb-3 ${
            isToday ? 'text-white' : 'text-gray-900'
          }`}>
            {event.title}
          </h3>

          {/* Source tag */}
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              isToday ? 'bg-white/20 text-white' : `${config.bgColor} ${config.color}`
            }`}>
              <span>{config.emoji}</span>
              {config.label}
            </span>

            {/* Arrow */}
            <span className={`flex items-center gap-1 text-sm opacity-60 group-hover:opacity-100 transition-all group-hover:translate-x-1 ${
              isToday ? 'text-white' : 'text-amber-600'
            }`}>
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
