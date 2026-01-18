interface StatsBarProps {
  totalEvents: number;
  thisWeekEvents: number;
  sourceCount: number;
}

export function StatsBar({ totalEvents, thisWeekEvents, sourceCount }: StatsBarProps) {
  return (
    <div className="grid grid-cols-3 gap-3 -mt-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
      <div className="glass glass-hover rounded-xl p-4 text-center transition-all duration-300 cursor-default group">
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl group-hover:scale-110 transition-transform">📊</span>
          <div>
            <div className="text-2xl font-bold text-emerald-400">{totalEvents}</div>
            <div className="text-xs text-slate-400">全イベント</div>
          </div>
        </div>
      </div>
      <div className="glass glass-hover rounded-xl p-4 text-center transition-all duration-300 cursor-default group">
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl group-hover:scale-110 transition-transform">🗓️</span>
          <div>
            <div className="text-2xl font-bold text-amber-400">{thisWeekEvents}</div>
            <div className="text-xs text-slate-400">今週開催</div>
          </div>
        </div>
      </div>
      <div className="glass glass-hover rounded-xl p-4 text-center transition-all duration-300 cursor-default group">
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl group-hover:scale-110 transition-transform">🌐</span>
          <div>
            <div className="text-2xl font-bold text-pink-400">{sourceCount}</div>
            <div className="text-xs text-slate-400">情報源</div>
          </div>
        </div>
      </div>
    </div>
  );
}
