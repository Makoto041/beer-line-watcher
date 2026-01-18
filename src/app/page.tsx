import { prisma } from "@/server/db";
import { Prisma } from "../../generated/prisma";
import { EventCard } from "./components/EventCard";
import { SourceTabs } from "./components/SourceTabs";
import { PickupCard } from "./components/PickupCard";

export const dynamic = "force-dynamic";

// Source configurations with colors
const SOURCE_CONFIG: Record<string, { emoji: string; label: string; color: string; bgColor: string }> = {
  'beergirl-calendar': {
    emoji: '🍺',
    label: 'ビール女子',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  'walkerplus-liquor-kanto': {
    emoji: '🍷',
    label: 'Walkerplus',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  'beerfestival-info': {
    emoji: '🎪',
    label: 'ビアフェス情報',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
  },
  'alwayslovebeer': {
    emoji: '🍻',
    label: 'Always Love Beer',
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
  },
};

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ source?: string; q?: string }>;
}) {
  const params = await searchParams;
  const source = params?.source ?? "";
  const q = params?.q ?? "";

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  // Build where clause with focus on upcoming events
  const where: Prisma.EventWhereInput = {
    OR: [
      { eventDate: { gte: startOfToday } },
      {
        eventDate: null,
        createdAt: { gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
      },
    ],
  };

  if (source) where.sourceId = source;
  if (q) where.title = { contains: q, mode: 'insensitive' };

  const events = await prisma.event.findMany({
    where,
    orderBy: [{ eventDate: "asc" }, { createdAt: "desc" }],
    take: 50,
    include: { source: true },
  });

  const sources = await prisma.source.findMany();

  // Calculate stats
  const thisWeekEnd = new Date(now);
  thisWeekEnd.setDate(now.getDate() + 7);
  const thisWeekEvents = events.filter(
    (e) => e.eventDate && e.eventDate >= startOfToday && e.eventDate <= thisWeekEnd
  );

  // Pickup events: today's events + events within 3 days (up to 5)
  const threeDaysLater = new Date(now);
  threeDaysLater.setDate(now.getDate() + 3);
  const pickupEvents = events
    .filter((e) => e.eventDate && e.eventDate >= startOfToday && e.eventDate <= threeDaysLater)
    .slice(0, 5);

  // Check if event is today
  const isEventToday = (eventDate: Date | null) => {
    if (!eventDate) return false;
    const eventDay = new Date(eventDate);
    eventDay.setHours(0, 0, 0, 0);
    return eventDay.getTime() === startOfToday.getTime();
  };

  // Get event counts per source
  const sourceCounts = sources.reduce((acc, s) => {
    acc[s.id] = events.filter(e => e.sourceId === s.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <main className="min-h-screen bg-[#fbfbfd]">
      {/* Hero Section - Mobile optimized */}
      <section className="relative overflow-hidden bg-gradient-to-b from-amber-50 via-white to-[#fbfbfd] pt-8 pb-10 md:pt-16 md:pb-20">
        {/* Decorative elements - smaller on mobile */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-40 h-40 md:w-80 md:h-80 bg-gradient-to-br from-amber-200/40 to-orange-200/40 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 md:w-60 md:h-60 bg-gradient-to-br from-yellow-200/30 to-amber-200/30 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4">
          {/* Badge - smaller on mobile */}
          <div className="flex justify-center mb-4 md:mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 text-xs md:text-sm font-medium shadow-sm">
              <span className="animate-bounce">🍺</span>
              毎日自動更新
            </span>
          </div>

          {/* Title - responsive sizing */}
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-2 md:mb-4">
              ビール・お酒イベント
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-500 font-light max-w-2xl mx-auto px-2">
              全国のビールイベント情報を
              <br className="sm:hidden" />
              ひとつの場所で。
            </p>
          </div>

          {/* Stats - compact on mobile */}
          <div className="flex justify-center gap-4 sm:gap-6 md:gap-12 mt-6 md:mt-10">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent">
                {events.length}
              </div>
              <div className="text-xs sm:text-sm text-gray-500 mt-0.5 md:mt-1">イベント</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent">
                {thisWeekEvents.length}
              </div>
              <div className="text-xs sm:text-sm text-gray-500 mt-0.5 md:mt-1">今週開催</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent">
                {sources.length}
              </div>
              <div className="text-xs sm:text-sm text-gray-500 mt-0.5 md:mt-1">情報源</div>
            </div>
          </div>

          {/* Search Bar - mobile optimized */}
          <div className="max-w-2xl mx-auto mt-6 md:mt-10">
            <form className="relative">
              <div className="relative flex flex-col sm:flex-row gap-2 sm:gap-0">
                <div className="relative flex-1">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    name="q"
                    defaultValue={q}
                    placeholder="イベント名で検索..."
                    className="w-full pl-11 pr-4 sm:pr-28 py-3 md:py-4 text-base md:text-lg rounded-xl sm:rounded-2xl bg-white border-0 shadow-lg shadow-gray-200/50 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="sm:absolute sm:right-2 sm:top-1/2 sm:-translate-y-1/2 w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-xl shadow-md shadow-amber-500/25 hover:shadow-lg hover:shadow-amber-500/30 transition-all active:scale-[0.98]"
                >
                  検索
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Pickup Section - Horizontal scroll on mobile */}
      {pickupEvents.length > 0 && !source && !q && (
        <section className="py-6 md:py-10 bg-gradient-to-b from-[#fbfbfd] to-white">
          <div className="max-w-6xl mx-auto">
            {/* Section header */}
            <div className="px-4 mb-4 md:mb-6 flex items-center gap-2">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-lg md:text-xl shadow-md shadow-orange-500/20">
                🔥
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-gray-900">直近のイベント</h2>
                <p className="text-xs md:text-sm text-gray-500">3日以内に開催</p>
              </div>
            </div>

            {/* Horizontal scroll container */}
            <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
              <div className="flex gap-3 md:gap-4">
                {pickupEvents.map((event) => (
                  <PickupCard
                    key={event.id}
                    event={event}
                    sourceConfig={SOURCE_CONFIG[event.sourceId]}
                    isToday={isEventToday(event.eventDate)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {/* Source Tabs */}
        <SourceTabs
          sources={sources}
          sourceCounts={sourceCounts}
          currentSource={source}
          sourceConfig={SOURCE_CONFIG}
        />

        {/* Events Grid */}
        <section className="mt-6 md:mt-8">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 md:py-24">
              <div className="text-5xl md:text-7xl mb-4 md:mb-6 animate-bounce">🍺</div>
              <h3 className="text-xl md:text-2xl font-semibold text-gray-800 mb-2">
                イベントが見つかりません
              </h3>
              <p className="text-sm md:text-base text-gray-500 mb-4 md:mb-6">
                条件を変更して再度お試しください
              </p>
              <a
                href="/"
                className="px-5 py-2.5 md:px-6 md:py-3 bg-gray-900 hover:bg-gray-800 text-white text-sm md:text-base font-medium rounded-full transition-all hover:scale-105"
              >
                すべて表示
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {events.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  index={index}
                  sourceConfig={SOURCE_CONFIG[event.sourceId]}
                />
              ))}
            </div>
          )}
        </section>

        {/* Load More (if needed) */}
        {events.length >= 50 && (
          <div className="flex justify-center mt-8 md:mt-12">
            <p className="text-gray-500 text-xs md:text-sm">
              最大50件を表示しています
            </p>
          </div>
        )}
      </div>

      {/* Footer - Mobile optimized */}
      <footer className="bg-white border-t border-gray-100 mt-10 md:mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between md:gap-8">
            {/* Logo */}
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl md:text-2xl shadow-lg shadow-amber-500/20">
                🍺
              </div>
              <div className="text-center md:text-left">
                <div className="font-semibold text-gray-900 text-sm md:text-base">ビールイベント通知Bot</div>
                <div className="text-xs md:text-sm text-gray-500">毎日自動でイベント情報を更新</div>
              </div>
            </div>

            {/* Sources - wrap on mobile */}
            <div className="flex flex-wrap justify-center gap-1.5 md:gap-2">
              {sources.map((s) => {
                const config = SOURCE_CONFIG[s.id];
                return (
                  <span
                    key={s.id}
                    className={`inline-flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 rounded-full text-xs md:text-sm ${config?.bgColor || 'bg-gray-100'} ${config?.color || 'text-gray-600'}`}
                  >
                    <span>{config?.emoji || '📅'}</span>
                    <span className="hidden sm:inline">{config?.label || s.name || s.id}</span>
                  </span>
                );
              })}
            </div>
          </div>

          <div className="text-center text-xs md:text-sm text-gray-400 mt-6 md:mt-8 pt-6 md:pt-8 border-t border-gray-100">
            Made by MAKOTO IWABUCHI
          </div>
        </div>
      </footer>
    </main>
  );
}
