import { prisma } from "@/server/db";
import { Prisma } from "../../../generated/prisma";

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

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-black text-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
        <header className="mb-6 md:mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-2xl bg-emerald-400/15 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              🍺
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              ビール・お酒イベント一覧
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-400">
            ビール女子 / Walkerplus / beerfestival.info / alwayslovebeer.com から取得した直近のイベント情報
          </p>
        </header>

        <section className="mb-4 md:mb-6">
          <form className="flex flex-col md:flex-row gap-2 md:items-center">
            <input
              name="q"
              defaultValue={q}
              placeholder="キーワード検索（例：ビアフェス、IPA、渋谷）"
              className="flex-1 px-3 py-2 text-xs md:text-sm rounded-2xl bg-white/5 border border-white/10 text-slate-50 placeholder:text-slate-500 outline-none focus:border-emerald-400/80 focus:ring-1 focus:ring-emerald-400/50 transition-all"
            />
            <select
              name="source"
              defaultValue={source}
              className="px-3 py-2 text-xs md:text-sm rounded-2xl bg-white/5 border border-white/10 text-slate-50 outline-none focus:border-emerald-400/80 focus:ring-1 focus:ring-emerald-400/50 transition-all"
            >
              <option value="">すべてのソース</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.id}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-4 py-2 text-xs md:text-sm rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition-all shadow-sm hover:shadow-md"
            >
              絞り込み
            </button>
          </form>
        </section>

        <section>
          {events.length === 0 ? (
            <div className="mt-6 text-xs text-slate-400">
              条件に合うイベントがまだありません。
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {events.map((e) => {
                const eventDateStr = e.eventDate
                  ? `${e.eventDate.getMonth() + 1}/${e.eventDate.getDate()}`
                  : null;

                const createdAt = e.createdAt;
                const createdAtStr = `${createdAt.getFullYear()}-${String(
                  createdAt.getMonth() + 1
                ).padStart(2, "0")}-${String(createdAt.getDate()).padStart(
                  2,
                  "0"
                )}`;

                return (
                  <a
                    key={e.id}
                    href={e.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-2xl border border-white/5 bg-gradient-to-br from-white/5 to-white/0 hover:from-white/10 hover:border-emerald-300/30 transition-all shadow-sm hover:shadow-lg backdrop-blur-sm p-4"
                  >
                    <div className="flex items-center gap-2 text-[10px] text-emerald-300/80 mb-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-900/70 border border-emerald-400/40">
                        {e.source.name || e.sourceId}
                      </span>
                      {eventDateStr && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-900/70 border border-amber-400/40 text-amber-300">
                          📅 {eventDateStr}
                        </span>
                      )}
                      <span className="text-slate-400">登録: {createdAtStr}</span>
                    </div>
                    <h2 className="text-sm md:text-base font-semibold text-slate-50 leading-snug line-clamp-2">
                      {e.title}
                    </h2>
                    <p className="mt-2 text-[10px] text-emerald-200/80 break-all line-clamp-1">
                      {e.url}
                    </p>
                  </a>
                );
              })}
            </div>
          )}
        </section>

        <footer className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-xs text-slate-500">
            🍺 ビールイベント通知Bot - 毎週金曜日に新着イベントをLINEでお届け
          </p>
          <p className="text-[10px] text-slate-600 mt-1">
            ソース: {sources.length > 0 ? sources.map(s => s.name || s.id).join(" / ") : "ビール女子 / Walkerplus / beerfestival.info / alwayslovebeer.com"}
          </p>
        </footer>
      </div>
    </main>
  );
}
