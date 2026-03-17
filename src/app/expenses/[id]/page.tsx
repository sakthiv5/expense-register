"use client";

import { useState, useEffect, use } from "react";
import { format, parseISO } from "date-fns";

type Expense = {
  id: number;
  amount: number;
  date: string;
  category: string;
  tag: string;
  receipt_path: string | null;
  created_at: string;
};

export default function ExpenseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetch(`/api/expenses/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.expense) setExpense(data.expense);
        else setError("Expense not found.");
      })
      .catch(() => setError("Failed to load expense."))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok) {
        window.location.href = "/expenses";
      } else {
        setError("Failed to delete expense.");
        setIsDeleting(false);
      }
    } catch {
      setError("An error occurred.");
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--color-text-muted)' }}>
        Loading...
      </div>
    );
  }

  if (error && !expense) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--color-danger)' }}>
          {error}
        </div>
        <a href="/expenses" className="btn btn-secondary" style={{ width: '100%', marginTop: 'var(--spacing-md)' }}>
          ← Back to Reports
        </a>
      </div>
    );
  }

  if (!expense) return null;

  return (
    <div className="card">
      {/* Header */}
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Expense Details</h2>
      </div>

      {/* Amount */}
      <div style={{
        textAlign: 'center',
        padding: 'var(--spacing-lg)',
        marginBottom: 'var(--spacing-lg)',
        borderRadius: 'var(--radius-md)',
        background: 'linear-gradient(135deg, var(--color-primary), #00acc1)',
        color: 'white',
      }}>
        <div style={{ fontSize: '2rem', fontWeight: 700 }}>${expense.amount.toFixed(2)}</div>
        <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '4px' }}>
          {format(parseISO(expense.date), 'EEEE, MMMM d, yyyy')}
        </div>
      </div>

      {/* Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--color-border)' }}>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Category</span>
          <span style={{ fontWeight: 600 }}>{expense.category}</span>
        </div>
        {expense.tag && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Tag</span>
            <span style={{ fontWeight: 600 }}>{expense.tag}</span>
          </div>
        )}
        {expense.receipt_path && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Receipt</span>
            <a
              href={expense.receipt_path}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ padding: '4px 12px', fontSize: '0.75rem' }}
            >
              📎 View Receipt
            </a>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--spacing-sm) 0' }}>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Added</span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            {expense.created_at ? format(new Date(expense.created_at), 'MMM d, yyyy h:mm a') : '—'}
          </span>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          padding: 'var(--spacing-sm) var(--spacing-md)',
          marginBottom: 'var(--spacing-md)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(211, 47, 47, 0.1)',
          color: 'var(--color-danger)',
          fontWeight: 500,
          textAlign: 'center',
          fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      {/* Delete section */}
      {!showConfirm ? (
        <button
          type="button"
          className="btn"
          onClick={() => setShowConfirm(true)}
          style={{
            width: '100%',
            padding: 'var(--spacing-md)',
            fontSize: '1rem',
            backgroundColor: 'var(--color-danger)',
          }}
        >
          Delete Expense
        </button>
      ) : (
        <div style={{
          padding: 'var(--spacing-md)',
          borderRadius: 'var(--radius-md)',
          border: '2px solid var(--color-danger)',
          backgroundColor: 'rgba(211, 47, 47, 0.05)',
        }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--spacing-md)', textAlign: 'center' }}>
            Are you sure? This cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowConfirm(false)}
              style={{ flex: 1, padding: 'var(--spacing-sm)' }}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn"
              onClick={handleDelete}
              disabled={isDeleting}
              style={{
                flex: 1,
                padding: 'var(--spacing-sm)',
                backgroundColor: 'var(--color-danger)',
              }}
            >
              {isDeleting ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                  </svg>
                  Deleting...
                </span>
              ) : 'Yes, Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
