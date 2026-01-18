import { prisma } from "@/server/db";
import { Prisma } from "../../../generated/prisma";
import { EventCard } from "./EventCard";
import { SourceTabs } from "./SourceTabs";

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

export default async function EventsPage({
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

  // Get event counts per source
  const sourceCounts = sources.reduce((acc, s) => {
    acc[s.id] = events.filter(e => e.sourceId === s.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <main className="min-h-screen bg-[#fbfbfd]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-amber-50 via-white to-[#fbfbfd] pt-12 pb-16 md:pt-20 md:pb-24">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-amber-200/40 to-orange-200/40 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-gradient-to-br from-yellow-200/30 to-amber-200/30 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 text-sm font-medium shadow-sm">
              <span className="animate-bounce">🍺</span>
              毎週金曜日更新
            </span>
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 mb-4">
              ビール・お酒イベント
            </h1>
            <p className="text-xl md:text-2xl text-gray-500 font-light max-w-2xl mx-auto">
              全国のビールイベント情報を
              <br className="md:hidden" />
              ひとつの場所で。
            </p>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-12 mt-10">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent">{events.length}</div>
              <div className="text-sm text-gray-500 mt-1">イベント</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent">{thisWeekEvents.length}</div>
              <div className="text-sm text-gray-500 mt-1">今週開催</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent">{sources.length}</div>
              <div className="text-sm text-gray-500 mt-1">情報源</div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mt-10">
            <form className="relative">
              <div className="relative">
                <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="イベント名で検索..."
                  className="w-full pl-14 pr-32 py-4 text-lg rounded-2xl bg-white border-0 shadow-lg shadow-gray-200/50 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-xl shadow-md shadow-amber-500/25 hover:shadow-lg hover:shadow-amber-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  検索
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Source Tabs */}
        <SourceTabs
          sources={sources}
          sourceCounts={sourceCounts}
          currentSource={source}
          sourceConfig={SOURCE_CONFIG}
        />

        {/* Events Grid */}
        <section className="mt-8">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="text-7xl mb-6 animate-bounce">🍺</div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-2">
                イベントが見つかりません
              </h3>
              <p className="text-gray-500 mb-6">
                条件を変更して再度お試しください
              </p>
              <a
                href="/events"
                className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-full transition-all hover:scale-105"
              >
                すべて表示
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
          <div className="flex justify-center mt-12">
            <p className="text-gray-500 text-sm">
              最大50件を表示しています
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/20">
                🍺
              </div>
              <div>
                <div className="font-semibold text-gray-900">ビールイベント通知Bot</div>
                <div className="text-sm text-gray-500">毎週金曜日にLINEでお届け</div>
              </div>
            </div>

            {/* Sources */}
            <div className="flex flex-wrap justify-center gap-2">
              {sources.map((s) => {
                const config = SOURCE_CONFIG[s.id];
                return (
                  <span
                    key={s.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${config?.bgColor || 'bg-gray-100'} ${config?.color || 'text-gray-600'}`}
                  >
                    <span>{config?.emoji || '📅'}</span>
                    {config?.label || s.name || s.id}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="text-center text-sm text-gray-400 mt-8 pt-8 border-t border-gray-100">
            Made with 🍻 for beer lovers
          </div>
        </div>
      </footer>
    </main>
  );
}
