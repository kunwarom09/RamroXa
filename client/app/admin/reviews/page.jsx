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
        <span key={i} style={{ color: i <= rating ? '#f59e0b' : 'var(--muted-foreground)', fontSize: '13px', opacity: i <= rating ? 1 : 0.4 }}>
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
            background: 'var(--surface)',
            color: 'var(--primary)',
            border: '1px solid var(--border)',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            zIndex: 9999,
            fontSize: '13.5px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span style={{ color: 'var(--success)' }}>✓</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, margin: '0 0 4px 0', color: 'var(--primary)' }}>
            Customer Reviews
          </h1>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--muted-foreground)' }}>
            Moderate customer ratings, verified purchase feedback, and testimonials.
          </p>
        </div>
        <button
          type="button"
          onClick={loadReviews}
          className="btn btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Icon name="refresh" size={14} /> Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Reviews</div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: 'var(--primary)' }}>{totalCount}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Published</div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: 'var(--success)' }}>{publishedCount}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hidden</div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: 'var(--warning)' }}>{hiddenCount}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Verified Purchases</div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: 'var(--accent)' }}>{verifiedCount}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Average Rating</div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#f59e0b' }}>★</span> {avgRating}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '14px 16px',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center'
      }}>
        <form onSubmit={handleSearchSubmit} style={{ flex: '1 1 260px', display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Search by customer, review title, comment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              fontSize: '13px',
              background: 'var(--canvas)',
              color: 'var(--primary)',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            style={{ height: '34px', padding: '0 16px' }}
          >
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              fontSize: '13px',
              background: 'var(--canvas)',
              color: 'var(--primary)',
              cursor: 'pointer',
              height: '34px'
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
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              fontSize: '13px',
              background: 'var(--canvas)',
              color: 'var(--primary)',
              cursor: 'pointer',
              height: '34px'
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
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '13.5px' }}>
            Loading customer reviews...
          </div>
        ) : reviews.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--primary)' }}>No reviews found</div>
            <p style={{ fontSize: '13px', marginTop: '4px', color: 'var(--muted-foreground)' }}>Customer submitted reviews will appear here for moderation.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Product</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Rating</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Review & Feedback</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Reviewer</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Variant</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => {
                  const rId = r._id || r.id;
                  const prodName = r.product?.name || r.productName || r.productId || 'Product';
                  const prodSlug = r.product?.slug || r.productId;
                  const isBusy = actionLoading === rId;

                  return (
                    <tr key={rId} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.15s ease' }}>
                      {/* Product */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top', minWidth: '180px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
                          <Link href={`/product/${prodSlug}`} target="_blank" style={{ color: 'inherit', textDecoration: 'none' }}>
                            {prodName}
                          </Link>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '2px' }}>
                          ID: {r.productId}
                        </div>
                      </td>

                      {/* Rating */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '2px' }}>{renderStars(r.rating)}</div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)', marginTop: '2px' }}>
                          {r.rating} out of 5
                        </div>
                      </td>

                      {/* Review & Feedback */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top', maxWidth: '320px' }}>
                        {r.title && (
                          <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--primary)' }}>
                            {r.title}
                          </div>
                        )}
                        <div style={{ color: 'var(--primary)', opacity: 0.9, lineHeight: '1.4', wordBreak: 'break-word' }}>
                          {r.comment}
                        </div>
                      </td>

                      {/* Reviewer */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{r.userName || 'Anonymous'}</div>
                        {r.userEmail && (
                          <div style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>{r.userEmail}</div>
                        )}
                        {r.verifiedPurchase && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              background: 'var(--success-soft)',
                              color: 'var(--success)',
                              border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '10.5px',
                              fontWeight: 600,
                              marginTop: '4px'
                            }}
                          >
                            ✓ Verified Purchase
                          </span>
                        )}
                      </td>

                      {/* Variant */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top', whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--muted-foreground)' }}>
                        {r.variantLabel || (r.color || r.size ? `${r.color || ''} ${r.size ? `/ ${r.size}` : ''}` : '—')}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top', whiteSpace: 'nowrap', color: 'var(--muted-foreground)' }}>
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 9px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            background: r.status === 'published' ? 'var(--success-soft)' : 'var(--warning-soft)',
                            color: r.status === 'published' ? 'var(--success)' : 'var(--warning)',
                            border: `1px solid color-mix(in srgb, ${r.status === 'published' ? 'var(--success)' : 'var(--warning)'} 30%, transparent)`
                          }}
                        >
                          {r.status || 'published'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(r)}
                            disabled={isBusy}
                            className="btn btn-sm"
                            style={{
                              fontSize: '11.5px',
                              height: '28px',
                              padding: '0 8px',
                              background: r.status === 'published' ? 'var(--surface)' : 'var(--primary)',
                              color: r.status === 'published' ? 'var(--primary)' : 'var(--primary-foreground)',
                              borderColor: r.status === 'published' ? 'var(--border)' : 'var(--primary)'
                            }}
                            title={r.status === 'published' ? 'Hide from product page' : 'Publish on product page'}
                          >
                            {r.status === 'published' ? 'Hide' : 'Publish'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(rId)}
                            disabled={isBusy}
                            className="btn btn-sm btn-danger"
                            style={{
                              fontSize: '11.5px',
                              height: '28px',
                              padding: '0 8px'
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
