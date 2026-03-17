"use client";

import { useState, useEffect, useMemo } from "react";
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths } from "date-fns";

function getWeekRange(weeksAgo: number) {
  const now = new Date();
  const target = subWeeks(now, weeksAgo);
  const monday = startOfWeek(target, { weekStartsOn: 1 });
  const sunday = endOfWeek(target, { weekStartsOn: 1 });
  return {
    start: format(monday, 'yyyy-MM-dd'),
    end: format(sunday, 'yyyy-MM-dd'),
    label: format(monday, 'MMM d') + ' – ' + format(sunday, 'MMM d'),
  };
}

function getMonthRange(monthsAgo: number) {
  const now = new Date();
  const target = subMonths(now, monthsAgo);
  const first = startOfMonth(target);
  const last = endOfMonth(target);
  return {
    start: format(first, 'yyyy-MM-dd'),
    end: format(last, 'yyyy-MM-dd'),
    label: format(first, 'MMM yyyy'),
  };
}

type Expense = {
  id: number;
  amount: number;
};

type WeekSummary = {
  label: string;
  total: number;
};

export default function Reports() {
  const [weekComparison, setWeekComparison] = useState<WeekSummary[]>([]);
  const [monthComparison, setMonthComparison] = useState<WeekSummary[]>([]);

  // Filter state for comparisons
  const [compCategory, setCompCategory] = useState('');
  const [compTag, setCompTag] = useState('');
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  // Build filter query string for comparison fetches
  const filterParams = useMemo(() => {
    let params = '';
    if (compCategory) params += `&category=${encodeURIComponent(compCategory)}`;
    if (compTag) params += `&tag=${encodeURIComponent(compTag)}`;
    return params;
  }, [compCategory, compTag]);

  // Fetch available categories and tags
  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => { if (data.categories) setAllCategories(data.categories); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (compCategory) {
      fetch(`/api/tags?category=${encodeURIComponent(compCategory)}`)
        .then(res => res.json())
        .then(data => { if (data.tags) setAllTags(data.tags); })
        .catch(console.error);
    } else {
      setAllTags([]);
      setCompTag('');
    }
  }, [compCategory]);

  // Fetch comparison data for current + 2 previous weeks
  useEffect(() => {
    async function fetchWeekTotals() {
      const weeks = [getWeekRange(0), getWeekRange(1), getWeekRange(2)];
      const results: WeekSummary[] = [];

      for (const w of weeks) {
        try {
          const res = await fetch(`/api/expenses?page=1&limit=1000&startDate=${w.start}&endDate=${w.end}${filterParams}`);
          const data = await res.json();
          const total = (data.expenses || []).reduce((sum: number, e: Expense) => sum + e.amount, 0);
          results.push({ label: w.label, total });
        } catch {
          results.push({ label: w.label, total: 0 });
        }
      }
      setWeekComparison(results);
    }
    fetchWeekTotals();
  }, [filterParams]);

  // Fetch comparison data for current + 2 previous months
  useEffect(() => {
    async function fetchMonthTotals() {
      const months = [getMonthRange(0), getMonthRange(1), getMonthRange(2)];
      const results: WeekSummary[] = [];

      for (const m of months) {
        try {
          const res = await fetch(`/api/expenses?page=1&limit=10000&startDate=${m.start}&endDate=${m.end}${filterParams}`);
          const data = await res.json();
          const total = (data.expenses || []).reduce((sum: number, e: Expense) => sum + e.amount, 0);
          results.push({ label: m.label, total });
        } catch {
          results.push({ label: m.label, total: 0 });
        }
      }
      setMonthComparison(results);
    }
    fetchMonthTotals();
  }, [filterParams]);

  const maxWeekTotal = Math.max(...weekComparison.map(w => w.total), 1);
  const maxMonthTotal = Math.max(...monthComparison.map(m => m.total), 1);

  return (
    <div className="card">
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Reports</h2>
      </div>

      {/* Comparison Filters */}
      <div style={{
        marginBottom: 'var(--spacing-md)',
        padding: 'var(--spacing-sm) var(--spacing-md)',
        backgroundColor: 'var(--color-bg)',
        borderRadius: 'var(--radius-md)',
      }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 'var(--spacing-xs)' }}>
          Filter Comparisons
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: allTags.length > 0 ? 'var(--spacing-sm)' : '0' }}>
          {allCategories.map(c => (
            <button
              key={c}
              type="button"
              className={`chip ${compCategory === c ? 'chip-active' : ''}`}
              onClick={() => setCompCategory(compCategory === c ? '' : c)}
              style={{ fontSize: '0.6875rem', padding: '2px 8px' }}
            >
              {c}
            </button>
          ))}
          {compCategory && (
            <button
              type="button"
              className="chip"
              onClick={() => { setCompCategory(''); setCompTag(''); }}
              style={{ fontSize: '0.6875rem', padding: '2px 8px', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
            >
              × Clear
            </button>
          )}
        </div>
        {allTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {allTags.map(t => (
              <button
                key={t}
                type="button"
                className={`chip ${compTag === t ? 'chip-active' : ''}`}
                onClick={() => setCompTag(compTag === t ? '' : t)}
                style={{ fontSize: '0.625rem', padding: '2px 6px' }}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Weekly Comparison */}
      {weekComparison.length > 0 && (
        <details open style={{
          marginBottom: 'var(--spacing-md)',
          backgroundColor: 'var(--color-bg)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}>
          <summary style={{
            padding: 'var(--spacing-sm) var(--spacing-md)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            listStyle: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
          }}>
            <span style={{ display: 'inline-block' }}>▶</span>
            Weekly Comparison
          </summary>
          <div style={{ padding: '0 var(--spacing-md) var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {weekComparison.map((w, i) => (
              <div key={w.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', width: '100px', flexShrink: 0 }}>
                  {i === 0 ? 'This week' : i === 1 ? 'Last week' : '2 weeks ago'}
                </span>
                <div style={{ flex: 1, height: '20px', backgroundColor: 'var(--color-border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.max((w.total / maxWeekTotal) * 100, 2)}%`,
                    background: i === 0
                      ? 'linear-gradient(90deg, var(--color-primary), #00acc1)'
                      : i === 1
                        ? 'linear-gradient(90deg, #94a3b8, #64748b)'
                        : 'linear-gradient(90deg, #cbd5e1, #94a3b8)',
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, width: '70px', textAlign: 'right', flexShrink: 0 }}>
                  ${w.total.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Monthly Comparison */}
      {monthComparison.length > 0 && (
        <details open style={{
          marginBottom: 'var(--spacing-md)',
          backgroundColor: 'var(--color-bg)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}>
          <summary style={{
            padding: 'var(--spacing-sm) var(--spacing-md)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            listStyle: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
          }}>
            <span style={{ display: 'inline-block' }}>▶</span>
            Monthly Comparison
          </summary>
          <div style={{ padding: '0 var(--spacing-md) var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {monthComparison.map((m, i) => (
              <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', width: '100px', flexShrink: 0 }}>
                  {i === 0 ? 'This month' : i === 1 ? 'Last month' : '2 months ago'}
                </span>
                <div style={{ flex: 1, height: '20px', backgroundColor: 'var(--color-border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.max((m.total / maxMonthTotal) * 100, 2)}%`,
                    background: i === 0
                      ? 'linear-gradient(90deg, #00695c, #2e7d32)'
                      : i === 1
                        ? 'linear-gradient(90deg, #94a3b8, #64748b)'
                        : 'linear-gradient(90deg, #cbd5e1, #94a3b8)',
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, width: '70px', textAlign: 'right', flexShrink: 0 }}>
                  ${m.total.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
