"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";

interface SearchFormProps {
  defaultValue: string;
}

export function SearchForm({ defaultValue }: SearchFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);

  // Sync with URL changes (back/forward navigation)
  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set('q', value.trim());
    } else {
      params.delete('q');
    }
    const queryString = params.toString();
    router.replace(queryString ? `/?${queryString}` : '/', { scroll: false });
  }, [router, searchParams, value]);

  return (
    <form className="relative" onSubmit={handleSubmit}>
      <div className="relative flex flex-col sm:flex-row gap-2 sm:gap-0">
        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            name="q"
            value={value}
            onChange={(e) => setValue(e.target.value)}
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
  );
}
