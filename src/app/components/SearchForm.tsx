"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { Icon } from "./Icon";

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
          {/* Search icon */}
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            <Icon name="search" className="w-4 h-4" />
          </span>
          <input
            name="q"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="イベント名で検索..."
            className="input w-full pl-11 pr-4 sm:pr-28 py-3 md:py-4 text-base md:text-lg"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary sm:absolute sm:right-2 sm:top-1/2 sm:-translate-y-1/2 w-full sm:w-auto px-6 py-3 sm:py-2.5"
        >
          検索
        </button>
      </div>
    </form>
  );
}
