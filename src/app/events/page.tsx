import { prisma } from "@/server/db";
import { Prisma } from "../../../generated/prisma";
import { EventCard } from "./EventCard";
import { HeroSection } from "./HeroSection";
import { SearchForm } from "./SearchForm";
import { StatsBar } from "./StatsBar";

export const dynamic = "force-dynamic";

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
      // Future events
      {
        eventDate: {
          gte: startOfToday,
        },
      },
      // Recent events without date (created within last 14 days)
      {
        eventDate: null,
        createdAt: {
          gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
        },
      },
    ],
  };

  if (source) where.sourceId = source;
  if (q) where.title = { contains: q };

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

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 noise-overlay">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <HeroSection eventCount={events.length} />

        <div className="max-w-6xl mx-auto px-4 pb-12">
          {/* Stats Bar */}
          <StatsBar
            totalEvents={events.length}
            thisWeekEvents={thisWeekEvents.length}
            sourceCount={sources.length}
          />

          {/* Search Section */}
          <SearchForm sources={sources} currentSource={source} currentQuery={q} />

          {/* Events Grid */}
          <section className="mt-8">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up">
                <div className="text-6xl mb-4 animate-float">🍺</div>
                <h3 className="text-xl font-semibold text-slate-300 mb-2">
                  イベントが見つかりません
                </h3>
                <p className="text-sm text-slate-500">
                  条件を変更して再度お試しください
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map((e, index) => (
                  <EventCard
                    key={e.id}
                    event={e}
                    index={index}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t border-white/5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20 animate-pulse-glow">
                  🍺
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-300">
                    ビールイベント通知Bot
                  </p>
                  <p className="text-xs text-slate-500">
                    毎週金曜日に新着イベントをLINEでお届け
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {sources.map((s) => (
                  <span
                    key={s.id}
                    className="px-3 py-1 text-xs rounded-full bg-white/5 border border-white/10 text-slate-400"
                  >
                    {s.name || s.id}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-center text-xs text-slate-600 mt-6">
              Made with 🍻 for beer lovers
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}
