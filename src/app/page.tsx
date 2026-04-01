"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { apiUrl } from "@/lib/api";

export default function Home() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(apiUrl("/categories"))
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) setCategories(data.categories);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (category) {
      fetch(apiUrl(`/tags?category=${encodeURIComponent(category)}`))
        .then((res) => res.json())
        .then((data) => {
          if (data.tags) setTags(data.tags);
        })
        .catch(console.error);
    } else {
      setTags([]);
    }
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      setStatusMsg({ type: "error", text: "Amount must be greater than 0." });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg({ type: "", text: "" });

    try {
      let receiptKey: string | null = null;

      // If there's a receipt, upload it to S3 via presigned URL first
      if (receipt && receipt.size > 0) {
        const presignRes = await fetch(
          apiUrl(`/presigned-upload?filename=${encodeURIComponent(receipt.name)}&contentType=${encodeURIComponent(receipt.type || 'application/octet-stream')}`)
        );
        const presignData = await presignRes.json();

        if (!presignRes.ok) {
          setStatusMsg({ type: "error", text: "Failed to get upload URL." });
          setIsSubmitting(false);
          return;
        }

        // Upload directly to S3
        const uploadRes = await fetch(presignData.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": receipt.type || "application/octet-stream" },
          body: receipt,
        });

        if (!uploadRes.ok) {
          setStatusMsg({ type: "error", text: "Failed to upload receipt." });
          setIsSubmitting(false);
          return;
        }

        receiptKey = presignData.key;
      }

      // Create the expense
      const res = await fetch(apiUrl("/expenses"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          date,
          category: category.trim(),
          tag: (tag || "").trim(),
          receiptKey,
        }),
      });

      if (res.ok) {
        setStatusMsg({ type: "success", text: "Expense saved!" });
        setAmount("");
        setCategory("");
        setTag("");
        setReceipt(null);
        if (fileInputRef.current) fileInputRef.current.value = "";

        const catRes = await fetch(apiUrl("/categories"));
        const catData = await catRes.json();
        if (catData.categories) setCategories(catData.categories);
      } else {
        const errorData = await res.json();
        setStatusMsg({ type: "error", text: errorData.error || "Failed to save." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card">
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>New Expense</h2>
      </div>

      {statusMsg.text && (
        <div style={{
          padding: 'var(--spacing-sm) var(--spacing-md)',
          marginBottom: 'var(--spacing-md)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: statusMsg.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
          fontWeight: 500,
          textAlign: 'center',
          fontSize: '0.875rem'
        }}>
          {statusMsg.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Date and Amount */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="date">Date</label>
            <input
              type="date"
              id="date"
              className="form-control"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="amount">Amount ($)</label>
            <input
              type="number"
              id="amount"
              className="form-control"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              style={{ fontSize: '1.25rem', fontWeight: 600 }}
            />
          </div>
        </div>

        {/* Category */}
        <div className="form-group">
          <label className="form-label" htmlFor="category">Category</label>
          {categories.length > 0 && (
            <div className="chip-container">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`chip ${category === c ? 'chip-active' : ''}`}
                  onClick={() => setCategory(category === c ? '' : c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          <input
            id="category"
            className="form-control"
            placeholder="Or type a new category..."
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            autoComplete="off"
          />
        </div>

        {/* Tag */}
        <div className="form-group">
          <label className="form-label" htmlFor="tag">Tag</label>
          {tags.length > 0 && (
            <div className="chip-container">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`chip ${tag === t ? 'chip-active' : ''}`}
                  onClick={() => setTag(tag === t ? '' : t)}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          <input
            id="tag"
            className="form-control"
            placeholder={category ? "Or type a new tag (optional)..." : "Select category first..."}
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            autoComplete="off"
          />
        </div>

        {/* Receipt */}
        <div className="form-group">
          <label className="form-label">Receipt (Optional)</label>
          <div className="file-input-wrapper">
            <label className="file-input-trigger" style={receipt ? { borderColor: 'var(--color-success)', color: 'var(--color-success)', backgroundColor: 'rgba(16, 185, 129, 0.05)' } : {}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
              <span>{receipt ? receipt.name : "Capture or select file"}</span>
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,application/pdf"
              capture="environment"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setReceipt(e.target.files[0]);
                } else {
                  setReceipt(null);
                }
              }}
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn"
          style={{ width: '100%', padding: 'var(--spacing-md)', fontSize: '1.125rem', position: 'relative' }}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
              </svg>
              Saving...
            </span>
          ) : 'Save Expense'}
        </button>
      </form>
    </div>
  );
}
