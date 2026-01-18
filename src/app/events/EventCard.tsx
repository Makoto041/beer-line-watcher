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

interface EventCardProps {
  event: Event;
  index: number;
}

// Get source-specific styling
function getSourceStyle(sourceId: string): { emoji: string; color: string; bgColor: string; borderColor: string } {
  const styles: Record<string, { emoji: string; color: string; bgColor: string; borderColor: string }> = {
    'beergirl-calendar': {
      emoji: '🍺',
      color: 'text-emerald-300',
      bgColor: 'bg-emerald-900/50',
      borderColor: 'border-emerald-500/30',
    },
    'walkerplus-liquor-kanto': {
      emoji: '🍷',
      color: 'text-purple-300',
      bgColor: 'bg-purple-900/50',
      borderColor: 'border-purple-500/30',
    },
    'beerfestival-info': {
      emoji: '🎪',
      color: 'text-amber-300',
      bgColor: 'bg-amber-900/50',
      borderColor: 'border-amber-500/30',
    },
    'alwayslovebeer': {
      emoji: '🍻',
      color: 'text-pink-300',
      bgColor: 'bg-pink-900/50',
      borderColor: 'border-pink-500/30',
    },
  };

  return styles[sourceId] || {
    emoji: '📅',
    color: 'text-slate-300',
    bgColor: 'bg-slate-800/50',
    borderColor: 'border-slate-500/30',
  };
}

// Format date for display
function formatEventDate(date: Date): { month: string; day: string; weekday: string } {
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return {
    month: `${date.getMonth() + 1}月`,
    day: `${date.getDate()}`,
    weekday: weekdays[date.getDay()] ?? '',
  };
}

// Check if event is happening soon (within 3 days)
function isHappeningSoon(eventDate: Date | null): boolean {
  if (!eventDate) return false;
  const now = new Date();
  const diffTime = eventDate.getTime() - now.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 3;
}

// Check if event is today
function isToday(eventDate: Date | null): boolean {
  if (!eventDate) return false;
  const now = new Date();
  return (
    eventDate.getDate() === now.getDate() &&
    eventDate.getMonth() === now.getMonth() &&
    eventDate.getFullYear() === now.getFullYear()
  );
}

export function EventCard({ event, index }: EventCardProps) {
  const style = getSourceStyle(event.sourceId);
  const happeningSoon = isHappeningSoon(event.eventDate);
  const today = isToday(event.eventDate);
  const dateInfo = event.eventDate ? formatEventDate(event.eventDate) : null;

  // Calculate stagger delay (cap at 0.5s)
  const staggerDelay = Math.min(index * 0.05, 0.5);

  return (
    <a
      href={event.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${staggerDelay}s`, animationFillMode: 'forwards' }}
    >
      <div className={`relative h-full rounded-2xl border ${style.borderColor} bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-sm overflow-hidden transition-all duration-300 card-lift group-hover:border-emerald-400/50`}>
        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer" />

        {/* Happening soon badge */}
        {today && (
          <div className="absolute top-3 right-3 px-2 py-1 text-[10px] font-bold rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg animate-pulse">
            TODAY
          </div>
        )}
        {!today && happeningSoon && (
          <div className="absolute top-3 right-3 px-2 py-1 text-[10px] font-bold rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 shadow-lg">
            SOON
          </div>
        )}

        <div className="relative p-4">
          {/* Header with date and source */}
          <div className="flex items-start gap-3 mb-3">
            {/* Date display */}
            {dateInfo ? (
              <div className={`flex-shrink-0 w-14 h-14 rounded-xl ${style.bgColor} border ${style.borderColor} flex flex-col items-center justify-center transition-transform group-hover:scale-105`}>
                <span className="text-[10px] text-slate-400">{dateInfo.month}</span>
                <span className={`text-xl font-bold ${style.color}`}>{dateInfo.day}</span>
                <span className="text-[10px] text-slate-400">({dateInfo.weekday})</span>
              </div>
            ) : (
              <div className={`flex-shrink-0 w-14 h-14 rounded-xl ${style.bgColor} border ${style.borderColor} flex items-center justify-center text-2xl transition-transform group-hover:scale-105`}>
                {style.emoji}
              </div>
            )}

            {/* Source badge */}
            <div className="flex-1 min-w-0">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full ${style.bgColor} ${style.color} border ${style.borderColor}`}>
                <span>{style.emoji}</span>
                <span className="truncate">{event.source.name || event.sourceId}</span>
              </span>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-sm md:text-base font-semibold text-slate-100 leading-snug line-clamp-2 group-hover:text-emerald-300 transition-colors">
            {event.title}
          </h3>

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] text-slate-500">
              登録: {event.createdAt.toLocaleDateString('ja-JP')}
            </span>
            <span className="flex items-center gap-1 text-xs text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
              詳細を見る
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>

        {/* Bottom accent line */}
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent ${style.bgColor.replace('bg-', 'via-').replace('/50', '')} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
      </div>
    </a>
  );
}
