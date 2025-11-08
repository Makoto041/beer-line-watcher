import { prisma } from "@/server/db";
import { Prisma } from "../../generated/prisma";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ source?: string; q?: string }>;
}) {
  const params = await searchParams;
  const source = params?.source ?? "";
  const q = params?.q ?? "";

  const where: Prisma.EventWhereInput = {};
  if (source) where.sourceId = source;
  if (q) where.title = { contains: q };

  const events = await prisma.event.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
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
              Beer Event Watcher
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-400">
            指定サイトから取得したビール／お酒イベントの新着一覧。 LINE
            Botと連携して、自動でイベント更新を検知します。
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
              <option value="">All sources</option>
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
          <p className="mt-1 text-[10px] text-slate-500">
            最新100件を表示中。クエリはURLに反映されるので、そのまま共有可能。
          </p>
        </section>

        <section>
          {events.length === 0 ? (
            <div className="mt-6 text-xs text-slate-400">
              条件に合うイベントがまだありません。
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {events.map((e) => {
                const d = e.createdAt;
                const ds = `${d.getFullYear()}-${String(
                  d.getMonth() + 1
                ).padStart(2, "0")}-${String(d.getDate()).padStart(
                  2,
                  "0"
                )} ${String(d.getHours()).padStart(2, "0")}:${String(
                  d.getMinutes()
                ).padStart(2, "0")}`;

                return (
                  <a
                    key={e.id}
                    href={e.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-2xl border border-white/5 bg-gradient-to-br from-white/5 to-white/0 hover:from-white/10 hover:border-emerald-300/30 transition-all shadow-sm hover:shadow-lg backdrop-blur-sm p-4"
                  >
                    <div className="flex items-center gap-2 text-[10px] text-emerald-300/80 mb-1">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-900/70 border border-emerald-400/40">
                        {e.source.name || e.sourceId}
                      </span>
                      <span className="text-slate-400">{ds}</span>
                    </div>
                    <h2 className="text-sm md:text-base font-semibold text-slate-50 leading-snug line-clamp-2">
                      {e.title}
                    </h2>
                    <p className="mt-2 text-[10px] text-emerald-200/80 break-all">
                      {e.url}
                    </p>
                  </a>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
