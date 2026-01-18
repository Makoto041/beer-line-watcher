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
  variant?: 'today' | 'soon' | 'week';
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

// Variant styles
const variantStyles = {
  today: {
    container: 'bg-gradient-to-br from-red-500 via-orange-500 to-amber-500 text-white shadow-lg shadow-red-500/30',
    dateBg: 'bg-white/20',
    dateText: 'text-white',
    dateSubText: 'text-white/80',
    titleText: 'text-white',
    tagBg: 'bg-white/20 text-white',
    arrowText: 'text-white',
    badge: 'TODAY!',
    badgeClass: 'bg-white/20 animate-pulse',
  },
  soon: {
    container: 'bg-gradient-to-br from-orange-100 to-amber-100 border border-orange-200/50 shadow-md',
    dateBg: 'bg-white shadow-sm',
    dateText: 'text-orange-600',
    dateSubText: 'text-gray-500',
    titleText: 'text-gray-900',
    tagBg: '',
    arrowText: 'text-orange-600',
    badge: 'まもなく',
    badgeClass: 'bg-orange-500 text-white',
  },
  week: {
    container: 'bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200/50 shadow-md',
    dateBg: 'bg-white shadow-sm',
    dateText: 'text-emerald-600',
    dateSubText: 'text-gray-500',
    titleText: 'text-gray-900',
    tagBg: '',
    arrowText: 'text-emerald-600',
    badge: '今週',
    badgeClass: 'bg-emerald-500 text-white',
  },
};

export function PickupCard({ event, sourceConfig, variant = 'week' }: PickupCardProps) {
  const dateInfo = event.eventDate ? formatEventDate(event.eventDate) : null;
  const styles = variantStyles[variant];

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
      <div className={`relative h-full rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${styles.container}`}>
        {/* Badge */}
        <div className="absolute top-3 right-3">
          <span className={`px-3 py-1 backdrop-blur-sm rounded-full text-xs font-bold ${styles.badgeClass}`}>
            {styles.badge}
          </span>
        </div>

        <div className="p-5">
          {/* Date display */}
          {dateInfo && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl mb-3 ${styles.dateBg}`}>
              <span className={`text-2xl font-bold ${styles.dateText}`}>
                {dateInfo.month}/{dateInfo.day}
              </span>
              <span className={`text-sm ${styles.dateSubText}`}>
                ({dateInfo.weekday})
              </span>
            </div>
          )}

          {/* Title */}
          <h3 className={`text-lg font-bold leading-snug line-clamp-2 mb-3 ${styles.titleText}`}>
            {event.title}
          </h3>

          {/* Source tag */}
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              variant === 'today' ? styles.tagBg : `${config.bgColor} ${config.color}`
            }`}>
              <span>{config.emoji}</span>
              {config.label}
            </span>

            {/* Arrow */}
            <span className={`flex items-center gap-1 text-sm opacity-60 group-hover:opacity-100 transition-all group-hover:translate-x-1 ${styles.arrowText}`}>
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
