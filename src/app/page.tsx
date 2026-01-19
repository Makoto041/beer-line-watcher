import { prisma } from "@/server/db";
import { Prisma } from "../../generated/prisma";
import { EventCard } from "./components/EventCard";
import { SourceTabs } from "./components/SourceTabs";
import { SearchForm } from "./components/SearchForm";
import { PickupCard } from "./components/PickupCard";
import { PickupCarousel } from "./components/PickupCarousel";
import { LineBotBanner, LineBotFooterLink } from "./components/LineBotBanner";
import { getStartOfTodayJST, getDaysFromTodayJST, formatDateTimeJST } from "@/lib/date-utils";
import { removeDuplicates } from "@/server/utils/duplicateDetector";

export const dynamic = "force-dynamic";

// Source configurations with colors
const SOURCE_CONFIG: Record<string, { emoji: string; label: string; color: string; bgColor: string }> = {
  'beergirl-calendar': {
    emoji: '🍺',
    label: 'ビール女子',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  'alwayslovebeer-calendar': {
    emoji: '🗓️',
    label: '全国ビールイベント',
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
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
};

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ source?: string; q?: string }>;
}) {
  const params = await searchParams;
  const source = params?.source ?? "";
  const q = params?.q ?? "";

  // Use JST for all date comparisons
  const startOfTodayJST = getStartOfTodayJST();

  // Base where clause for upcoming events (without source filter)
  const baseWhere: Prisma.EventWhereInput = {
    OR: [
      { eventDate: { gte: startOfTodayJST } },
      {
        eventDate: null,
        createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
      },
    ],
  };

  // Build filtered where clause for display
  const filteredWhere: Prisma.EventWhereInput = {
    ...baseWhere,
    ...(source && { sourceId: source }),
    ...(q && { title: { contains: q, mode: 'insensitive' as const } }),
  };

  // Fetch events for display (with filters applied at DB level)
  const rawEvents = await prisma.event.findMany({
    where: filteredWhere,
    orderBy: [{ eventDate: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: { source: true },
  });

  // Fetch all events for counting (without source/search filters)
  const allRawEvents = await prisma.event.findMany({
    where: baseWhere,
    orderBy: [{ eventDate: "asc" }, { createdAt: "desc" }],
    include: { source: true },
  });

  // Remove duplicates across sources (keeps higher priority source)
  const uniqueEvents = removeDuplicates(
    rawEvents.map(e => ({
      title: e.title,
      url: e.url,
      eventDate: e.eventDate || undefined,
      sourceId: e.sourceId,
    })),
    0.6
  );

  // Map back to full event objects
  const uniqueUrls = new Set(uniqueEvents.map(e => e.url));
  const events = rawEvents.filter(e => uniqueUrls.has(e.url)).slice(0, 50);

  const sources = await prisma.source.findMany();

  // Calculate stats using JST-based day differences
  const thisWeekEvents = events.filter((e) => {
    if (!e.eventDate) return false;
    const days = getDaysFromTodayJST(e.eventDate);
    return days >= 0 && days <= 7;
  });

  // Pickup events categorized by time (using JST)
  // Today's events (days = 0)
  const todayEvents = events.filter((e) => {
    if (!e.eventDate) return false;
    return getDaysFromTodayJST(e.eventDate) === 0;
  });

  // Within 3 days (days = 1, 2)
  const within3DaysEvents = events.filter((e) => {
    if (!e.eventDate) return false;
    const days = getDaysFromTodayJST(e.eventDate);
    return days >= 1 && days <= 2;
  });

  // Within 1 week (days = 3, 4, 5, 6)
  const within1WeekEvents = events.filter((e) => {
    if (!e.eventDate) return false;
    const days = getDaysFromTodayJST(e.eventDate);
    return days >= 3 && days <= 6;
  });

  const hasPickupEvents = todayEvents.length > 0 || within3DaysEvents.length > 0 || within1WeekEvents.length > 0;

  // Get latest update time per source
  const sourceLatestUpdate = sources.reduce((acc, s) => {
    const sourceEvents = events.filter(e => e.sourceId === s.id);
    if (sourceEvents.length > 0) {
      acc[s.id] = sourceEvents.reduce(
        (latest, e) => e.createdAt > latest ? e.createdAt : latest,
        sourceEvents[0]!.createdAt
      );
    }
    return acc;
  }, {} as Record<string, Date>);

  // Format update time using JST
  const formatUpdateTime = (date: Date) => formatDateTimeJST(date);

  // Get overall latest update
  const latestUpdateTime = Object.values(sourceLatestUpdate).length > 0
    ? Object.values(sourceLatestUpdate).reduce((a, b) => a > b ? a : b)
    : null;

  // Get event counts per source (from all events, not filtered)
  // Remove duplicates from all events first for accurate counts
  const allUniqueEvents = removeDuplicates(
    allRawEvents.map(e => ({
      title: e.title,
      url: e.url,
      eventDate: e.eventDate || undefined,
      sourceId: e.sourceId,
    })),
    0.6
  );
  const allUniqueUrls = new Set(allUniqueEvents.map(e => e.url));
  const allEvents = allRawEvents.filter(e => allUniqueUrls.has(e.url));

  const sourceCounts = sources.reduce((acc, s) => {
    acc[s.id] = allEvents.filter(e => e.sourceId === s.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <main className="min-h-screen bg-[#fbfbfd] overflow-x-hidden">
      {/* Hero Section - Mobile optimized */}
      <section className="relative overflow-hidden bg-gradient-to-b from-amber-50 via-white to-[#fbfbfd] pt-8 pb-10 md:pt-16 md:pb-20">
        {/* Decorative elements - smaller on mobile */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-40 h-40 md:w-80 md:h-80 bg-gradient-to-br from-amber-200/40 to-orange-200/40 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 md:w-60 md:h-60 bg-gradient-to-br from-yellow-200/30 to-amber-200/30 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4">
          {/* Update time badge */}
          <div className="flex flex-col items-center gap-2 mb-4 md:mb-6">
            {latestUpdateTime && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 text-xs md:text-sm font-medium shadow-sm">
                <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                最終更新: {formatUpdateTime(latestUpdateTime)}
              </span>
            )}
            {/* Source update times */}
            <div className="flex flex-wrap justify-center gap-1.5">
              {sources.map((s) => {
                const config = SOURCE_CONFIG[s.id];
                const lastUpdate = sourceLatestUpdate[s.id];
                return (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] md:text-xs bg-white/80 text-gray-600 shadow-sm"
                  >
                    <span>{config?.emoji || '📅'}</span>
                    <span className="hidden sm:inline">{config?.label || s.id}:</span>
                    <span className={lastUpdate ? 'text-gray-700' : 'text-red-500'}>
                      {lastUpdate ? formatUpdateTime(lastUpdate) : '未取得'}
                    </span>
                  </span>
                );
              })}
            </div>
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
            <SearchForm defaultValue={q} />
          </div>
        </div>
      </section>

      {/* LINE Bot Banner - Hero position */}
      {!source && !q && <LineBotBanner />}

      {/* Pickup Sections - Categorized by time */}
      {hasPickupEvents && !source && !q && (
        <section className="py-6 md:py-10 bg-gradient-to-b from-[#fbfbfd] to-white space-y-6 md:space-y-8">
          {/* TODAY */}
          {todayEvents.length > 0 && (
            <div className="max-w-6xl mx-auto">
              <div className="px-4 mb-3 md:mb-4 flex items-center gap-2">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-lg md:text-xl shadow-md shadow-red-500/20 animate-pulse">
                  🎉
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">TODAY!</h2>
                  <p className="text-xs md:text-sm text-gray-500">本日開催のイベント</p>
                </div>
              </div>
              <PickupCarousel speed={25}>
                {todayEvents.map((event) => (
                  <PickupCard
                    key={event.id}
                    event={event}
                    sourceConfig={SOURCE_CONFIG[event.sourceId]}
                    variant="today"
                  />
                ))}
              </PickupCarousel>
            </div>
          )}

          {/* Within 3 days */}
          {within3DaysEvents.length > 0 && (
            <div className="max-w-6xl mx-auto">
              <div className="px-4 mb-3 md:mb-4 flex items-center gap-2">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-lg md:text-xl shadow-md shadow-orange-500/20">
                  🔥
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">まもなく開催</h2>
                  <p className="text-xs md:text-sm text-gray-500">3日以内</p>
                </div>
              </div>
              <PickupCarousel speed={30}>
                {within3DaysEvents.map((event) => (
                  <PickupCard
                    key={event.id}
                    event={event}
                    sourceConfig={SOURCE_CONFIG[event.sourceId]}
                    variant="soon"
                  />
                ))}
              </PickupCarousel>
            </div>
          )}

          {/* Within 1 week */}
          {within1WeekEvents.length > 0 && (
            <div className="max-w-6xl mx-auto">
              <div className="px-4 mb-3 md:mb-4 flex items-center gap-2">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-lg md:text-xl shadow-md shadow-emerald-500/20">
                  📅
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">今週のイベント</h2>
                  <p className="text-xs md:text-sm text-gray-500">1週間以内</p>
                </div>
              </div>
              <PickupCarousel speed={35}>
                {within1WeekEvents.map((event) => (
                  <PickupCard
                    key={event.id}
                    event={event}
                    sourceConfig={SOURCE_CONFIG[event.sourceId]}
                    variant="week"
                  />
                ))}
              </PickupCarousel>
            </div>
          )}
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

            {/* LINE Bot Link + Sources */}
            <div className="flex flex-col items-center gap-3 md:gap-4">
              <LineBotFooterLink />
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
          </div>

          <div className="text-center text-xs md:text-sm text-gray-400 mt-6 md:mt-8 pt-6 md:pt-8 border-t border-gray-100">
            Made by MAKOTO IWABUCHI
          </div>
        </div>
      </footer>
    </main>
  );
}
