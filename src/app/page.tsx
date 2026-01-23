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
    color: 'text-amber-400',
    bgColor: 'bg-amber-900/30',
  },
  'alwayslovebeer-calendar': {
    emoji: '🗓️',
    label: '全国ビールイベント',
    color: 'text-sky-400',
    bgColor: 'bg-sky-900/30',
  },
  'walkerplus-liquor-kanto': {
    emoji: '🍷',
    label: 'Walkerplus',
    color: 'text-purple-400',
    bgColor: 'bg-purple-900/30',
  },
  'beerfestival-info': {
    emoji: '🎪',
    label: 'ビアフェス情報',
    color: 'text-rose-400',
    bgColor: 'bg-rose-900/30',
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

  // New arrivals: events created within last 3 days
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const isNewArrivalsFilter = source === 'new';

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
    ...(source && !isNewArrivalsFilter && { sourceId: source }),
    ...(isNewArrivalsFilter && { createdAt: { gte: threeDaysAgo } }),
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

  // Count new arrivals (created within last 3 days)
  const newArrivalsCount = allEvents.filter(e => e.createdAt >= threeDaysAgo).length;

  // Get latest update time per source (from all events, not filtered)
  const sourceLatestUpdate = sources.reduce((acc, s) => {
    const sourceEvents = allEvents.filter(e => e.sourceId === s.id);
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

  return (
    <main className="min-h-screen bg-[#0d1117] overflow-x-hidden">
      {/* Hero Section - DQ Style */}
      <section className="relative overflow-hidden pt-8 pb-10 md:pt-12 md:pb-16">
        {/* Background pattern - subtle pixel grid */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,215,0,0.1) 20px, rgba(255,215,0,0.1) 21px),
                              repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,215,0,0.1) 20px, rgba(255,215,0,0.1) 21px)`
          }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-4">
          {/* Title Window - DQ Style */}
          <div className="dq-window p-6 md:p-8 mb-6 md:mb-8">
            {/* Update time badge */}
            <div className="flex flex-col items-center gap-2 mb-4 md:mb-6">
              {latestUpdateTime && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded bg-black/30 border border-amber-500/30 text-amber-400 text-xs md:text-sm">
                  <span className="opacity-70">最終更新:</span>
                  <span>{formatUpdateTime(latestUpdateTime)}</span>
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
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] md:text-xs bg-black/20 text-gray-400 border border-gray-700/50"
                    >
                      <span>{config?.emoji || '📅'}</span>
                      <span className="hidden sm:inline">{config?.label || s.id}:</span>
                      <span className={lastUpdate ? 'text-gray-300' : 'text-red-400'}>
                        {lastUpdate ? formatUpdateTime(lastUpdate) : '未取得'}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Title - DQ Style */}
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-2 md:mb-4">
                <span className="text-glow-gold text-amber-400">ビール・お酒イベント</span>
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-gray-400">
                全国のビールイベント情報を
                <br className="sm:hidden" />
                ひとつの場所で。
              </p>
            </div>

            {/* Stats - DQ Status Style */}
            <div className="flex justify-center gap-4 sm:gap-8 md:gap-12 mt-6 md:mt-8">
              <div className="text-center dq-window-beer p-3 md:p-4 min-w-[80px] md:min-w-[100px]">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-400 text-glow-amber">
                  {events.length}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">イベント</div>
              </div>
              <div className="text-center dq-window-beer p-3 md:p-4 min-w-[80px] md:min-w-[100px]">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-400 text-glow-amber">
                  {thisWeekEvents.length}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">今週開催</div>
              </div>
              <div className="text-center dq-window-beer p-3 md:p-4 min-w-[80px] md:min-w-[100px]">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-400 text-glow-amber">
                  {sources.length}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">情報源</div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mt-6 md:mt-8">
              <SearchForm defaultValue={q} />
            </div>
          </div>

          {/* LINE Bot Banner - inside hero for better visibility on mobile */}
          {!source && !q && <LineBotBanner />}
        </div>
      </section>

      {/* Pickup Sections - Categorized by time */}
      {hasPickupEvents && !source && !q && (
        <section className="py-6 md:py-10 space-y-6 md:space-y-8">
          {/* TODAY */}
          {todayEvents.length > 0 && (
            <div className="max-w-6xl mx-auto">
              <div className="px-4 mb-3 md:mb-4 flex items-center gap-2">
                <div className="dq-badge dq-badge-today flex items-center gap-2">
                  <span className="text-lg">🎉</span>
                  <span>TODAY!</span>
                </div>
                <span className="text-xs md:text-sm text-gray-500">本日開催のイベント</span>
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
                <div className="dq-badge dq-badge-soon flex items-center gap-2">
                  <span className="text-lg">🔥</span>
                  <span>まもなく開催</span>
                </div>
                <span className="text-xs md:text-sm text-gray-500">3日以内</span>
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
                <div className="dq-badge dq-badge-week flex items-center gap-2">
                  <span className="text-lg">📅</span>
                  <span>今週のイベント</span>
                </div>
                <span className="text-xs md:text-sm text-gray-500">1週間以内</span>
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
          newArrivalsCount={newArrivalsCount}
        />

        {/* Events Grid */}
        <section className="mt-6 md:mt-8">
          {events.length === 0 ? (
            <div className="dq-window flex flex-col items-center justify-center py-16 md:py-24">
              <div className="text-5xl md:text-7xl mb-4 md:mb-6 beer-icon">🍺</div>
              <h3 className="text-xl md:text-2xl font-bold text-amber-400 text-glow-gold mb-2">
                イベントが見つかりません
              </h3>
              <p className="text-sm md:text-base text-gray-400 mb-4 md:mb-6">
                条件を変更して再度お試しください
              </p>
              <a
                href="/"
                className="dq-button"
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

      {/* Footer - DQ Style */}
      <footer className="border-t border-amber-900/30 mt-10 md:mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          <div className="dq-window p-6 md:p-8">
            <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between md:gap-8">
              {/* Logo */}
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-xl md:text-2xl border-2 border-amber-400 beer-icon">
                  🍺
                </div>
                <div className="text-center md:text-left">
                  <div className="font-bold text-amber-400 text-sm md:text-base text-glow-gold">ビールイベント通知Bot</div>
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
                        className={`inline-flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 rounded text-xs md:text-sm ${config?.bgColor || 'bg-gray-800'} ${config?.color || 'text-gray-400'} border border-current/20`}
                      >
                        <span>{config?.emoji || '📅'}</span>
                        <span className="hidden sm:inline">{config?.label || s.name || s.id}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="text-center text-xs md:text-sm text-gray-600 mt-6 md:mt-8 pt-6 md:pt-8 border-t border-gray-700/50">
              Made by MAKOTO IWABUCHI
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
