export function HeroSection({ eventCount }: { eventCount: number }) {
  return (
    <header className="relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 via-amber-500/20 to-pink-500/20 animate-gradient" />

      <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Left side - Title and description */}
          <div className="text-center md:text-left animate-slide-in">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-3xl shadow-xl shadow-emerald-500/30 animate-float">
                  🍺
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-900 animate-bounce-in">
                  {eventCount > 99 ? '99+' : eventCount}
                </div>
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">
                  <span className="gradient-text">ビール</span>
                  <span className="text-slate-100">イベント</span>
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Beer & Sake Events
                </p>
              </div>
            </div>
            <p className="text-slate-400 text-sm md:text-base max-w-md">
              全国のビール・お酒イベント情報を毎日更新。
              <br className="hidden md:block" />
              お気に入りのイベントを見つけよう！
            </p>
          </div>

          {/* Right side - Quick stats */}
          <div className="flex gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="glass rounded-2xl px-6 py-4 text-center">
              <div className="text-3xl font-bold gradient-text">{eventCount}</div>
              <div className="text-xs text-slate-400 mt-1">イベント</div>
            </div>
            <div className="glass rounded-2xl px-6 py-4 text-center">
              <div className="text-3xl">📅</div>
              <div className="text-xs text-slate-400 mt-1">毎日更新</div>
            </div>
            <div className="glass rounded-2xl px-6 py-4 text-center">
              <div className="text-3xl">🔔</div>
              <div className="text-xs text-slate-400 mt-1">LINE通知</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-950 to-transparent" />
    </header>
  );
}
