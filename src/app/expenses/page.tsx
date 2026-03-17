"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { format, parseISO, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { DonutChart } from "@/components/DonutChart";

type Expense = {
  id: number;
  amount: number;
  date: string;
  category: string;
  tag: string;
  receipt_path: string | null;
  created_at: string;
};

type GroupedExpenses = {
  [date: string]: Expense[];
};

function getWeekRange(weeksAgo: number) {
  const now = new Date();
  const target = subWeeks(now, weeksAgo);
  const monday = startOfWeek(target, { weekStartsOn: 1 });
  const sunday = endOfWeek(target, { weekStartsOn: 1 });
  return {
    start: format(monday, 'yyyy-MM-dd'),
    end: format(sunday, 'yyyy-MM-dd'),
  };
}

export default function AllExpenses() {
  const thisWeek = getWeekRange(0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState(thisWeek.start);
  const [endDate, setEndDate] = useState(thisWeek.end);
  const [totalSum, setTotalSum] = useState(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Expense[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSearchActive = searchQuery.length >= 2;

  const loaderRef = useRef(null);

  const fetchExpenses = useCallback(async (pageNum: number, reset: boolean = false) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      let url = `/api/expenses?page=${pageNum}&limit=20`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.expenses) {
        if (reset) {
          setExpenses(data.expenses);
          setTotalSum(data.totalAmount || 0);
        } else {
          setExpenses(prev => [...prev, ...data.expenses]);
        }
        setHasMore(pageNum < data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchExpenses(1, true);
  }, [startDate, endDate, fetchExpenses]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !isLoading) {
          setPage(p => p + 1);
        }
      },
      { threshold: 0.1 }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) observer.observe(currentLoader);
    return () => { if (currentLoader) observer.unobserve(currentLoader); };
  }, [hasMore, isLoading]);

  useEffect(() => {
    if (page > 1) fetchExpenses(page, false);
  }, [page, fetchExpenses]);

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (searchQuery.length < 2) {
      setSearchResults([]);
      setSearchTotal(0);
      return;
    }

    setIsSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        let url = `/api/expenses?page=1&limit=200&search=${encodeURIComponent(searchQuery)}`;
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;

        const res = await fetch(url);
        const data = await res.json();
        setSearchResults(data.expenses || []);
        setSearchTotal(data.totalAmount || 0);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery, startDate, endDate]);

  const displayExpenses = isSearchActive ? searchResults : expenses;
  const displayTotal = isSearchActive ? searchTotal : totalSum;

  const groupedExpenses = displayExpenses.reduce((acc: GroupedExpenses, curr) => {
    const dateStr = format(parseISO(curr.date), 'MMM d, yyyy');
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(curr);
    return acc;
  }, {});

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return map;
  }, [expenses]);

  const tagBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.tag] = (map[e.tag] || 0) + e.amount; });
    return map;
  }, [expenses]);

  const displayCount = isSearchActive ? searchResults.length : expenses.length;

  return (
    <div className="card">
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>All Expenses</h2>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 'var(--spacing-sm)' }}>
        <input
          type="text"
          className="form-control"
          placeholder="🔍 Search categories & tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ fontSize: '0.875rem', paddingRight: searchQuery ? '2rem' : undefined }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              fontSize: '1rem',
              padding: '2px',
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Date Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="startDate" style={{ fontSize: '0.75rem' }}>From</label>
          <input type="date" id="startDate" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ fontSize: '0.875rem', padding: '0.35rem 0.5rem' }} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="endDate" style={{ fontSize: '0.75rem' }}>To</label>
          <input type="date" id="endDate" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ fontSize: '0.875rem', padding: '0.35rem 0.5rem' }} />
        </div>
      </div>

      {/* Total Banner */}
      {displayCount > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'var(--spacing-sm) var(--spacing-md)',
          marginBottom: 'var(--spacing-md)',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, var(--color-primary), #00acc1)',
          color: 'white',
        }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
            {isSearchActive ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}` : 'Total'}
          </span>
          <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>${displayTotal.toFixed(2)}</span>
        </div>
      )}

      {/* Charts - collapsible (hidden during search) */}
      {!isSearchActive && expenses.length > 0 && (
        <details style={{
          marginBottom: 'var(--spacing-md)',
          backgroundColor: 'var(--color-bg)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}>
          <summary style={{
            padding: 'var(--spacing-sm) var(--spacing-md)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.8125rem',
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            listStyle: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
          }}>
            <span style={{ display: 'inline-block' }}>▶</span>
            Charts
          </summary>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 'var(--spacing-md)',
            padding: 'var(--spacing-md)',
          }}>
            <DonutChart data={categoryBreakdown} title="By Category" />
            <DonutChart data={tagBreakdown} title="By Tag" />
          </div>
        </details>
      )}

      {/* Expense List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        {Object.entries(groupedExpenses).map(([dateLabel, dayExpenses]) => (
          <div key={dateLabel}>
            <div className="date-group-header">{dateLabel}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {dayExpenses.map(exp => (
                <a key={exp.id} href={`/expenses/${exp.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="report-row" style={{ cursor: 'pointer', transition: 'background-color 150ms' }}>
                    <div className="report-row-info">
                      <span className="report-row-category">{exp.category}</span>
                      <span className="report-row-tag">· {exp.tag}</span>
                      {exp.receipt_path && (
                        <span className="report-row-receipt">📎</span>
                      )}
                    </div>
                    <span className="report-row-amount">${exp.amount.toFixed(2)}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}

        {displayCount === 0 && !isLoading && !isSearching && (
          <div style={{ textAlign: 'center', padding: 'var(--spacing-lg)', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            {isSearchActive ? 'No matching expenses found.' : 'No expenses found.'}
          </div>
        )}
        {isSearching && (
          <div style={{ textAlign: 'center', padding: 'var(--spacing-sm)', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
            Searching...
          </div>
        )}
      </div>

      {!isSearchActive && (
        <div ref={loaderRef} style={{ textAlign: 'center', padding: 'var(--spacing-sm)', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
          {isLoading && <span>Loading...</span>}
        </div>
      )}
    </div>
  );
}
