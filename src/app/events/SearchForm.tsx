"use client";

import { useState } from "react";

interface Source {
  id: string;
  name: string | null;
}

interface SearchFormProps {
  sources: Source[];
  currentSource: string;
  currentQuery: string;
}

export function SearchForm({ sources, currentSource, currentQuery }: SearchFormProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <section className="mt-8 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
      <form className="relative">
        <div className={`glass rounded-2xl p-4 transition-all duration-300 ${isFocused ? 'ring-2 ring-emerald-400/50' : ''}`}>
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search input */}
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                name="q"
                defaultValue={currentQuery}
                placeholder="イベント名で検索..."
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="w-full pl-10 pr-4 py-3 text-sm rounded-xl bg-white/5 border border-white/10 text-slate-50 placeholder:text-slate-500 outline-none focus:bg-white/10 transition-all"
              />
            </div>

            {/* Source filter */}
            <div className="relative">
              <select
                name="source"
                defaultValue={currentSource}
                className="appearance-none w-full md:w-48 px-4 py-3 text-sm rounded-xl bg-white/5 border border-white/10 text-slate-50 outline-none focus:bg-white/10 transition-all cursor-pointer"
              >
                <option value="">すべてのソース</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.id}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="px-6 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] glow-on-hover"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                絞り込み
              </span>
            </button>
          </div>

          {/* Quick filter chips */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-xs text-slate-500">人気のキーワード:</span>
            {['ビアフェス', 'IPA', 'クラフトビール', '試飲会', '東京'].map((keyword) => (
              <button
                key={keyword}
                type="button"
                onClick={() => {
                  const input = document.querySelector('input[name="q"]') as HTMLInputElement;
                  if (input) {
                    input.value = keyword;
                    input.form?.submit();
                  }
                }}
                className="px-3 py-1 text-xs rounded-full bg-white/5 border border-white/10 text-slate-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:text-emerald-300 transition-all"
              >
                {keyword}
              </button>
            ))}
          </div>
        </div>
      </form>
    </section>
  );
}
