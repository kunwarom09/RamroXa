'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../../services/apiClient';
import Icon from '../../../components/admin/Icons';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [toastMsg, setToastMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const loadReviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (ratingFilter !== 'all') params.set('rating', ratingFilter);

      const res = await api.get(`/api/admin/reviews?${params.toString()}`);
      setReviews(res.data?.reviews || res.data || []);
    } catch (err) {
      console.error('Failed to load reviews:', err);
      showToast('Error loading reviews: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [statusFilter, ratingFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadReviews();
  };

  const handleToggleStatus = async (review) => {
    const newStatus = review.status === 'published' ? 'hidden' : 'published';
    setActionLoading(review._id || review.id);
    try {
      await api.patch(`/api/admin/reviews/${review._id || review.id}/status`, { status: newStatus });
      setReviews(prev =>
        prev.map(r => ((r._id || r.id) === (review._id || review.id) ? { ...r, status: newStatus } : r))
      );
      showToast(`Review marked as ${newStatus}`);
    } catch (err) {
      showToast('Failed to update review: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (reviewId) => {
    if (!confirm('Are you sure you want to permanently delete this review?')) return;
    setActionLoading(reviewId);
    try {
      await api.delete(`/api/admin/reviews/${reviewId}`);
      setReviews(prev => prev.filter(r => (r._id || r.id) !== reviewId));
      showToast('Review deleted successfully');
    } catch (err) {
      showToast('Failed to delete review: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const totalCount = reviews.length;
  const publishedCount = reviews.filter(r => r.status === 'published').length;
  const hiddenCount = reviews.filter(r => r.status === 'hidden').length;
  const verifiedCount = reviews.filter(r => r.verifiedPurchase).length;
  const avgRating = totalCount > 0
    ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / totalCount).toFixed(1)
    : '0.0';

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} style={{ color: i <= rating ? '#f59e0b' : '#d1d5db', fontSize: '14px' }}>
          ★
        </span>
      );
    }
    return stars;
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#111827',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 9999,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>✓</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 6px 0', color: 'var(--foreground, #111)' }}>
            Customer Reviews
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted-foreground, #666)' }}>
            Moderate ratings, verified purchase reviews, and customer feedback.
          </p>
        </div>
        <button
          onClick={loadReviews}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: 'var(--card, #fff)',
            border: '1px solid var(--border, #e5e7eb)',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            color: 'var(--foreground, #111)'
          }}
        >
          <Icon name="refresh" size={14} /> Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--card, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground, #666)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Reviews</div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: 'var(--foreground, #111)' }}>{totalCount}</div>
        </div>
        <div style={{ background: 'var(--card, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Published</div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: '#10b981' }}>{publishedCount}</div>
        </div>
        <div style={{ background: 'var(--card, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hidden</div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: '#f59e0b' }}>{hiddenCount}</div>
        </div>
        <div style={{ background: 'var(--card, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Verified Purchases</div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: '#3b82f6' }}>{verifiedCount}</div>
        </div>
        <div style={{ background: 'var(--card, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground, #666)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Average Rating</div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: 'var(--foreground, #111)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>★</span> {avgRating}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ background: 'var(--card, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <form onSubmit={handleSearchSubmit} style={{ flex: '1 1 260px', display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Search by customer, comment, title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border, #d1d5db)',
              fontSize: '13px',
              background: 'var(--background, #fff)',
              color: 'var(--foreground, #111)'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              background: '#000',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border, #d1d5db)',
              fontSize: '13px',
              background: 'var(--background, #fff)',
              color: 'var(--foreground, #111)',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="hidden">Hidden</option>
          </select>

          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border, #d1d5db)',
              fontSize: '13px',
              background: 'var(--background, #fff)',
              color: 'var(--foreground, #111)',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars ★★★★★</option>
            <option value="4">4 Stars ★★★★☆</option>
            <option value="3">3 Stars ★★★☆☆</option>
            <option value="2">2 Stars ★★☆☆☆</option>
            <option value="1">1 Star ★☆☆☆☆</option>
          </select>
        </div>
      </div>

      {/* Reviews Table */}
      <div style={{ background: 'var(--card, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted-foreground, #666)' }}>
            Loading customer reviews...
          </div>
        ) : reviews.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--muted-foreground, #666)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--foreground, #111)' }}>No reviews found</div>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>Customer submitted reviews will appear here for moderation.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--muted, #f9fafb)', borderBottom: '1px solid var(--border, #e5e7eb)', color: 'var(--muted-foreground, #666)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 16px' }}>Product</th>
                  <th style={{ padding: '12px 16px' }}>Rating</th>
                  <th style={{ padding: '12px 16px' }}>Review & Feedback</th>
                  <th style={{ padding: '12px 16px' }}>Reviewer</th>
                  <th style={{ padding: '12px 16px' }}>Variant</th>
                  <th style={{ padding: '12px 16px' }}>Date</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => {
                  const rId = r._id || r.id;
                  const prodName = r.product?.name || r.productName || r.productId || 'Product';
                  const prodSlug = r.product?.slug || r.productId;
                  const isBusy = actionLoading === rId;

                  return (
                    <tr key={rId} style={{ borderBottom: '1px solid var(--border, #f3f4f6)', transition: 'background-color 0.15s ease' }}>
                      {/* Product */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top', minWidth: '180px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--foreground, #111)' }}>
                          <Link href={`/product/${prodSlug}`} target="_blank" style={{ color: 'inherit', textDecoration: 'none' }}>
                            {prodName}
                          </Link>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--muted-foreground, #888)', marginTop: '2px' }}>
                          ID: {r.productId}
                        </div>
                      </td>

                      {/* Rating */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '2px' }}>{renderStars(r.rating)}</div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--foreground, #111)', marginTop: '2px' }}>
                          {r.rating} out of 5
                        </div>
                      </td>

                      {/* Review & Feedback */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top', maxWidth: '320px' }}>
                        {r.title && (
                          <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--foreground, #111)' }}>
                            {r.title}
                          </div>
                        )}
                        <div style={{ color: 'var(--foreground, #333)', lineHeight: '1.4', wordBreak: 'break-word' }}>
                          {r.comment}
                        </div>
                      </td>

                      {/* Reviewer */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: 'var(--foreground, #111)' }}>{r.userName || 'Anonymous'}</div>
                        {r.userEmail && (
                          <div style={{ fontSize: '11px', color: 'var(--muted-foreground, #888)' }}>{r.userEmail}</div>
                        )}
                        {r.verifiedPurchase && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              background: '#ecfdf5',
                              color: '#065f46',
                              border: '1px solid #a7f3d0',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              marginTop: '4px'
                            }}
                          >
                            ✓ Verified Purchase
                          </span>
                        )}
                      </td>

                      {/* Variant */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top', whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--muted-foreground, #666)' }}>
                        {r.variantLabel || (r.color || r.size ? `${r.color || ''} ${r.size ? `/ ${r.size}` : ''}` : '—')}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top', whiteSpace: 'nowrap', color: 'var(--muted-foreground, #666)' }}>
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '999px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            background: r.status === 'published' ? '#ecfdf5' : '#fef3c7',
                            color: r.status === 'published' ? '#047857' : '#b45309',
                            border: `1px solid ${r.status === 'published' ? '#a7f3d0' : '#fde68a'}`
                          }}
                        >
                          {r.status || 'published'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => handleToggleStatus(r)}
                            disabled={isBusy}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--border, #d1d5db)',
                              background: r.status === 'published' ? '#fff' : '#000',
                              color: r.status === 'published' ? '#111' : '#fff',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: 500
                            }}
                            title={r.status === 'published' ? 'Hide from product page' : 'Publish on product page'}
                          >
                            {r.status === 'published' ? 'Hide' : 'Publish'}
                          </button>
                          <button
                            onClick={() => handleDelete(rId)}
                            disabled={isBusy}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid #fecaca',
                              background: '#fef2f2',
                              color: '#dc2626',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                            title="Delete review"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
