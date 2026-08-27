'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DEFAULT_HOMEPAGE_CONFIG,
  loadHomepageConfig
} from '../services/homepageCms';

// ─── Helpers ────────────────────────────────────────────────────────────────
const rs = (n) => 'Rs ' + (n || 0).toLocaleString('en-US');

const COLOR_HEX_MAP = {
  black: '#111111',
  white: '#ffffff',
  khaki: '#c3b091',
  oatmeal: '#e3dac9',
  natural: '#f2eecb',
  blue: '#3b5998',
  indigo: '#2e4482',
  denim: '#466d98',
  brown: '#6e4a2e',
  grey: '#888888',
  gray: '#888888',
  'heather grey': '#9e9e9e',
  charcoal: '#374151',
  olive: '#556b2f',
  sage: '#9caf88',
  navy: '#1e293b',
  cream: '#fdfbf7',
  beige: '#e6dfd5',
  red: '#dc2626',
  burgundy: '#800020',
  orange: '#ea580c',
  yellow: '#eab308',
  green: '#16a34a',
  pink: '#ec4899',
  purple: '#8b5cf6'
};

// ─── SVG Icons ───────────────────────────────────────────────────────────────
function IconTruck() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function IconReturn() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

function IconSupport() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// ─── PRODUCT CARD COMPONENT ──────────────────────────────────────────────────
function ProductCard({ product, onOpen, compact = false }) {
  const best = product.labels?.bestSelling;
  const featured = product.labels?.featured;
  const badgeText = best ? '★ Best Seller' : featured ? '✦ Featured' : product.labels?.newArrival ? '✦ New Arrival' : '✦ Latest Drop';
  const priceNpr = product.basePrice !== undefined ? Math.round(product.basePrice / 100) : (product.price || 0);
  const mrpNpr = product.mrp !== undefined ? Math.round(product.mrp / 100) : 0;
  const compare = mrpNpr || priceNpr;
  const featuredImg = (product.images || []).find(i => i.isFeatured) || (product.images || [])[0];
  const imgSrc = featuredImg?.url || product.img1 || '';

  const pColors = (Array.isArray(product.colors) && product.colors.length > 0)
    ? product.colors
    : (Array.isArray(product.options?.Colour || product.options?.Color || product.options?.colours || product.options?.colors)
      ? (product.options?.Colour || product.options?.Color || product.options?.colours || product.options?.colors)
      : (Array.isArray(product.variants)
        ? Array.from(new Set(product.variants.map(v => v.name || v.color || v.option).filter(Boolean)))
        : []));

  return (
    <div
      className={`rmx-product-card ${compact ? 'rmx-compact-card' : ''}`}
      onClick={() => onOpen(product)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onOpen(product)}
    >
      <div className="rmx-product-img-wrap" style={{ backgroundImage: imgSrc ? `url('${imgSrc}')` : undefined }}>
        <span className={`rmx-product-badge ${best ? 'best-seller' : ''}`}>{badgeText}</span>
      </div>
      <div className="rmx-product-card-body">
        <div className="rmx-product-meta-row">
          <span className="rmx-product-brand">{product.brand || 'Ramroxa'}</span>
          {pColors && pColors.length > 0 && (
            <div className="rmx-product-color-swatches" title={`Available in: ${pColors.join(', ')}`}>
              {pColors.slice(0, 4).map(col => {
                const hex = COLOR_HEX_MAP[String(col).toLowerCase().trim()] || '#333333';
                return (
                  <span
                    key={col}
                    className="rmx-color-dot"
                    style={{ backgroundColor: hex }}
                    title={String(col)}
                  />
                );
              })}
              {pColors.length > 4 && (
                <span className="rmx-color-more">+{pColors.length - 4}</span>
              )}
            </div>
          )}
        </div>
        <span className="rmx-product-name">{product.name}</span>
        <div className="rmx-product-prices">
          <span className="rmx-price">{rs(priceNpr)}</span>
          {compare > priceNpr && <span className="rmx-compare">{rs(compare)}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── 1. HERO BANNER WIDGETS ──────────────────────────────────────────────────
function HeroSection({ section, onNav }) {
  const { widgetType = 'hero_overlay', config = {} } = section;
  const slides = config.slides || [];
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const goTo = useCallback((idx) => {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrent(idx);
      setTransitioning(false);
    }, 350);
  }, [transitioning]);

  useEffect(() => {
    if (!config.autoplay || slides.length <= 1) return;
    const interval = setInterval(() => {
      goTo((current + 1) % slides.length);
    }, config.slideDuration || 6000);
    return () => clearInterval(interval);
  }, [current, slides.length, config.autoplay, config.slideDuration, goTo]);

  if (!slides.length) return null;
  const slide = slides[current] || slides[0];

  const handleCta = (url) => {
    if (!url) return;
    if (url.includes('/shop')) onNav('collections', { colFilter: 'all' });
    else if (url === '/contact') onNav('contact');
    else if (url.startsWith('http')) window.open(url, '_blank');
    else onNav('collections', { colFilter: 'all' });
  };

  // Widget Layout 1: Split Hero (Side-by-side text & image)
  if (widgetType === 'hero_split') {
    return (
      <section className="rmx-hero rmx-hero-split-layout">
        <div className="rmx-hero-split-grid">
          <div className="rmx-hero-split-content">
            {slide.eyebrow && <span className="rmx-hero-eyebrow">{slide.eyebrow}</span>}
            <h1 className="rmx-hero-heading">{slide.heading}</h1>
            {slide.description && <p className="rmx-hero-desc">{slide.description}</p>}
            <div className="rmx-hero-actions">
              {slide.primaryCta && (
                <button className="rmx-hero-btn-primary" onClick={() => handleCta(slide.primaryCtaUrl)}>
                  {slide.primaryCta}
                </button>
              )}
              {slide.secondaryCta && (
                <button className="rmx-hero-btn-secondary" onClick={() => handleCta(slide.secondaryCtaUrl)}>
                  {slide.secondaryCta}
                </button>
              )}
            </div>
          </div>
          <div className="rmx-hero-split-img" style={{ backgroundImage: `url('${slide.image}')` }} />
        </div>
      </section>
    );
  }

  // Widget Layout 2: Full-width Centered Hero
  if (widgetType === 'hero_fullwidth') {
    return (
      <section className="rmx-hero rmx-hero-fullwidth-layout" style={{ backgroundImage: `url('${slide.image}')` }}>
        <div className="rmx-hero-center-overlay" />
        <div className="rmx-hero-center-content">
          {slide.eyebrow && <span className="rmx-hero-eyebrow">{slide.eyebrow}</span>}
          <h1 className="rmx-hero-heading" style={{ textAlign: 'center' }}>{slide.heading}</h1>
          {slide.description && <p className="rmx-hero-desc" style={{ textAlign: 'center', maxWidth: '580px' }}>{slide.description}</p>}
          <div className="rmx-hero-actions" style={{ justifyContent: 'center', marginTop: '24px' }}>
            {slide.primaryCta && (
              <button className="rmx-hero-btn-primary" onClick={() => handleCta(slide.primaryCtaUrl)}>
                {slide.primaryCta}
              </button>
            )}
            {slide.secondaryCta && (
              <button className="rmx-hero-btn-secondary" onClick={() => handleCta(slide.secondaryCtaUrl)}>
                {slide.secondaryCta}
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Widget Layout 3: Image-Only Banner
  if (widgetType === 'hero_image_only') {
    return (
      <section
        className="rmx-hero rmx-hero-image-only"
        style={{ backgroundImage: `url('${slide.image}')`, cursor: 'pointer' }}
        onClick={() => handleCta(slide.primaryCtaUrl || '/shop')}
      />
    );
  }

  // Widget Layout 4 (Default / Carousel / Overlay): Pixel-Matched Reference Split-Bottom Overlay
  return (
    <section className="rmx-hero" aria-label="Hero slider">
      <div className="rmx-hero-track">
        {slides.map((s, i) => (
          <div
            key={s.id || i}
            className={`rmx-hero-slide ${i === current ? 'active' : ''}`}
            style={{ backgroundImage: `url('${s.image}')` }}
          />
        ))}
      </div>
      <div className="rmx-hero-overlay" />

      <div className="rmx-hero-inner">
        <div className="rmx-hero-left">
          {slide.eyebrow && <span className="rmx-hero-eyebrow">{slide.eyebrow}</span>}
          <h1 className="rmx-hero-heading">{slide.heading}</h1>
        </div>

        <div className="rmx-hero-right">
          {slide.description && <p className="rmx-hero-desc">{slide.description}</p>}
          <div className="rmx-hero-actions">
            {slide.primaryCta && (
              <button className="rmx-hero-btn-primary" onClick={() => handleCta(slide.primaryCtaUrl)}>
                {slide.primaryCta}
              </button>
            )}
            {slide.secondaryCta && (
              <button className="rmx-hero-btn-secondary" onClick={() => handleCta(slide.secondaryCtaUrl)}>
                {slide.secondaryCta}
              </button>
            )}
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <div className="rmx-hero-dots" role="tablist">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`rmx-hero-dot ${i === current ? 'active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              role="tab"
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── 2. PRODUCTS GRID / SLIDER / CAROUSEL WIDGETS ─────────────────────────────
function ProductsSection({ section, catalog, onOpenProduct, onNav }) {
  const { widgetType = 'grid_3', config = {} } = section;
  const isBestSellerSection = section.type === 'bestsellers';
  const tagRule = config.tag || (isBestSellerSection ? 'bestSelling' : 'featured');
  const limit = config.limit || (widgetType === 'grid_3' ? 3 : 8);

  const isMatching = (p) => {
    if (tagRule === 'bestSelling') {
      if (p.labels?.bestSelling) return true;
      const tags = Array.isArray(p.tags) ? p.tags.join(' ') : String(p.tags || '');
      return /best[\s-]?selling|bestseller|top[\s-]?pick/i.test(tags);
    }
    if (tagRule === 'featured') {
      if (p.labels?.featured) return true;
      const tags = Array.isArray(p.tags) ? p.tags.join(' ') : String(p.tags || '');
      return /featured|hand[\s-]?picked/i.test(tags);
    }
    const tags = Array.isArray(p.tags) ? p.tags.join(' ') : String(p.tags || '');
    return new RegExp(tagRule, 'i').test(tags) || p.labels?.[tagRule];
  };

  let products = catalog.filter(isMatching).slice(0, limit);
  if (!products.length && catalog.length > 0) {
    products = catalog.slice(0, limit);
  }
  if (!products.length) return null;

  const title = config.title || (isBestSellerSection ? 'Best Sellers' : 'Featured');
  const eyebrow = config.eyebrow || (isBestSellerSection ? 'Top Picks' : 'Hand-picked');
  const cta = config.cta || 'View All';
  const ctaUrl = config.ctaUrl || '/shop';

  // Large Featured layout (1 large card + rest)
  if (widgetType === 'large_featured' && products.length > 1) {
    const lead = products[0];
    const rest = products.slice(1, 5);
    return (
      <section className="rmx-section">
        <div className="rmx-section-inner">
          <div className="rmx-section-head">
            <div>
              <span className="rmx-section-eyebrow">{eyebrow}</span>
              <h2 className="rmx-section-title">{title}</h2>
            </div>
            <button className="rmx-link-btn" onClick={() => onNav('collections', { colFilter: 'all' })}>
              {cta} →
            </button>
          </div>
          <div className="rmx-large-featured-grid">
            <div className="rmx-large-lead-card" onClick={() => onOpenProduct(lead)}>
              <div className="rmx-large-lead-img" style={{ backgroundImage: `url('${(lead.images || [])[0]?.url || lead.img1}')` }} />
              <div className="rmx-large-lead-body">
                <span className="rmx-hero-eyebrow">Spotlight Item</span>
                <h3>{lead.name}</h3>
                <span className="rmx-price">{rs(lead.basePrice ? Math.round(lead.basePrice / 100) : lead.price)}</span>
                <button className="rmx-btn-primary" style={{ marginTop: '12px' }}>View Details</button>
              </div>
            </div>
            <div className="rmx-products-3col">
              {rest.map((p, idx) => (
                <ProductCard key={p.id || idx} product={p} onOpen={() => onOpenProduct(p)} />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Slider / Horizontal Carousel
  if (widgetType === 'slider' || widgetType === 'carousel') {
    return (
      <section className="rmx-section">
        <div className="rmx-section-inner">
          <div className="rmx-section-head">
            <div>
              <span className="rmx-section-eyebrow">{eyebrow}</span>
              <h2 className="rmx-section-title">{title}</h2>
            </div>
            <button className="rmx-link-btn" onClick={() => onNav('collections', { colFilter: 'all' })}>
              {cta} →
            </button>
          </div>
          <div className="rmx-products-slider-row">
            {products.map((p, idx) => (
              <div key={p.id || idx} className="rmx-slider-item">
                <ProductCard product={p} onOpen={() => onOpenProduct(p)} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Compact layout
  if (widgetType === 'compact') {
    return (
      <section className="rmx-section">
        <div className="rmx-section-inner">
          <div className="rmx-section-head">
            <div>
              <span className="rmx-section-eyebrow">{eyebrow}</span>
              <h2 className="rmx-section-title">{title}</h2>
            </div>
            <button className="rmx-link-btn" onClick={() => onNav('collections', { colFilter: 'all' })}>
              {cta} →
            </button>
          </div>
          <div className="rmx-products-compact-grid">
            {products.map((p, idx) => (
              <ProductCard key={p.id || idx} product={p} onOpen={() => onOpenProduct(p)} compact />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Standard Grids (3-col or 4-col)
  const gridClass = widgetType === 'grid_4' ? 'rmx-products-grid' : 'rmx-products-3col';

  return (
    <section className="rmx-section">
      <div className="rmx-section-inner">
        <div className="rmx-section-head">
          <div>
            <span className="rmx-section-eyebrow">{eyebrow}</span>
            <h2 className="rmx-section-title">{title}</h2>
          </div>
          <button className="rmx-link-btn" onClick={() => onNav('collections', { colFilter: 'all' })}>
            {cta} →
          </button>
        </div>
        <div className={gridClass}>
          {products.map((p, idx) => (
            <ProductCard key={p.id || idx} product={p} onOpen={() => onOpenProduct(p)} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 3. CATEGORY SPOTLIGHT WIDGETS ───────────────────────────────────────────
function CategoriesSection({ section, onNav }) {
  const { widgetType = 'bento_3', config = {} } = section;
  const items = config.items || [];
  const men = items[0] || { title: 'MEN', heading: 'Built for Daily\nConfidence', image: '/assets/44312e50fe56c782.q.jpg', cta: 'Shop Men', url: '/shop?gender=men' };
  const women = items[1] || { title: 'WOMEN', heading: 'Designed For\nModern Living', image: '/assets/7f7ad2764f25606b.q.jpg', cta: 'Shop Women', url: '/shop?gender=women' };
  const kids = items[2] || { title: 'KIDS', heading: 'Comfort For\nEvery Adventure', image: '/assets/0ffbe14d4cba1d4a.q.jpg', cta: 'Shop Kids', url: '/shop?gender=kids' };

  const handleCatClick = (url) => {
    if (!url) return;
    if (url.includes('gender=men')) onNav('collections', { colFilter: 'men' });
    else if (url.includes('gender=women')) onNav('collections', { colFilter: 'women' });
    else if (url.includes('gender=kids')) onNav('collections', { colFilter: 'kids' });
    else onNav('collections', { colFilter: 'all' });
  };

  const title = config.title || 'Shop by Categories';
  const eyebrow = config.eyebrow || 'Collections';

  // Widget Layout 2: 3-Card Equal Grid
  if (widgetType === 'grid_3') {
    return (
      <section className="rmx-section rmx-categories">
        <div className="rmx-section-inner">
          <div className="rmx-section-head">
            <div>
              <span className="rmx-section-eyebrow">{eyebrow}</span>
              <h2 className="rmx-section-title">{title}</h2>
            </div>
          </div>
          <div className="rmx-cat-equal-grid">
            {[men, women, kids].map((cat, idx) => (
              <div key={idx} className="rmx-cat-equal-card" onClick={() => handleCatClick(cat.url)}>
                <div className="rmx-cat-equal-img" style={{ backgroundImage: `url('${cat.image}')` }} />
                <div className="rmx-cat-overlay" />
                <div className="rmx-cat-content">
                  <span className="rmx-bento-tag">{cat.title}</span>
                  <h3 className="rmx-bento-heading">{cat.heading}</h3>
                  <button className="rmx-bento-btn">{cat.cta}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Widget Layout 3: Split 2-Card Layout
  if (widgetType === 'split') {
    return (
      <section className="rmx-section rmx-categories">
        <div className="rmx-section-inner">
          <div className="rmx-section-head">
            <div>
              <span className="rmx-section-eyebrow">{eyebrow}</span>
              <h2 className="rmx-section-title">{title}</h2>
            </div>
          </div>
          <div className="rmx-cat-split-grid">
            {[men, women].map((cat, idx) => (
              <div key={idx} className="rmx-bento-card" style={{ minHeight: '380px' }} onClick={() => handleCatClick(cat.url)}>
                <div className="rmx-bento-img" style={{ backgroundImage: `url('${cat.image}')` }} />
                <div className="rmx-bento-overlay" />
                <div className="rmx-bento-content">
                  <span className="rmx-bento-tag">{cat.title}</span>
                  <h3 className="rmx-bento-heading">{cat.heading}</h3>
                  <button className="rmx-bento-btn">{cat.cta}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Widget Layout 4 (Default): Bento 3-Card Grid (Reference match)
  return (
    <section className="rmx-section rmx-categories">
      <div className="rmx-section-inner">
        <div className="rmx-section-head">
          <div>
            <span className="rmx-section-eyebrow">{eyebrow}</span>
            <h2 className="rmx-section-title">{title}</h2>
          </div>
        </div>

        <div className="rmx-bento-grid">
          {/* Left Column: Tall Men Card */}
          <div
            className="rmx-bento-card rmx-bento-men"
            onClick={() => handleCatClick(men.url)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && handleCatClick(men.url)}
          >
            <div className="rmx-bento-img" style={{ backgroundImage: `url('${men.image}')` }} />
            <div className="rmx-bento-overlay" />
            <div className="rmx-bento-content">
              <span className="rmx-bento-tag">{men.title || 'MEN'}</span>
              <h3 className="rmx-bento-heading">{men.heading || 'Built for Daily\nConfidence'}</h3>
              <button className="rmx-bento-btn" onClick={(e) => { e.stopPropagation(); handleCatClick(men.url); }}>
                {men.cta || 'Shop Men'}
              </button>
            </div>
          </div>

          {/* Right Column: Stack of Women and Kids */}
          <div className="rmx-bento-stack">
            {/* Top Right: Women */}
            <div
              className="rmx-bento-card rmx-bento-women"
              onClick={() => handleCatClick(women.url)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && handleCatClick(women.url)}
            >
              <div className="rmx-bento-img" style={{ backgroundImage: `url('${women.image}')` }} />
              <div className="rmx-bento-overlay" />
              <div className="rmx-bento-content">
                <span className="rmx-bento-tag">{women.title || 'WOMEN'}</span>
                <h3 className="rmx-bento-heading">{women.heading || 'Designed For\nModern Living'}</h3>
                <button className="rmx-bento-btn" onClick={(e) => { e.stopPropagation(); handleCatClick(women.url); }}>
                  {women.cta || 'Shop Women'}
                </button>
              </div>
            </div>

            {/* Bottom Right: Kids */}
            <div
              className="rmx-bento-card rmx-bento-kids"
              onClick={() => handleCatClick(kids.url)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && handleCatClick(kids.url)}
            >
              <div className="rmx-bento-img" style={{ backgroundImage: `url('${kids.image}')` }} />
              <div className="rmx-bento-overlay" />
              <div className="rmx-bento-content">
                <span className="rmx-bento-tag">{kids.title || 'KIDS'}</span>
                <h3 className="rmx-bento-heading">{kids.heading || 'Comfort For\nEvery Adventure'}</h3>
                <button className="rmx-bento-btn" onClick={(e) => { e.stopPropagation(); handleCatClick(kids.url); }}>
                  {kids.cta || 'Shop Kids'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 4. VIDEO SECTION WIDGETS ────────────────────────────────────────────────
function VideoSection({ section, onNav }) {
  const { widgetType = 'video_bg', config = {} } = section;
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      videoRef.current.play();
      setPlaying(true);
    }
  };

  const handleCta = (url) => {
    if (!url) return;
    if (url.includes('/shop')) onNav('collections', { colFilter: 'all' });
    else if (url === '/contact') onNav('contact');
    else if (url.startsWith('http')) window.open(url, '_blank');
  };

  if (widgetType === 'video_split') {
    return (
      <section className="rmx-section">
        <div className="rmx-section-inner">
          <div className="rmx-video-split-grid">
            <div className="rmx-video-split-media">
              {config.videoUrl ? (
                <video src={config.videoUrl} poster={config.posterImage} controls className="rmx-video-el" />
              ) : (
                <div className="rmx-video-placeholder" style={{ backgroundImage: `url('${config.posterImage || '/assets/44312e50fe56c782.q.jpg'}')` }} />
              )}
            </div>
            <div className="rmx-video-split-text">
              {config.eyebrow && <span className="rmx-hero-eyebrow">{config.eyebrow}</span>}
              <h2 className="rmx-section-title" style={{ fontSize: '32px', margin: '8px 0 16px' }}>{config.heading || 'Move with Ramroxa'}</h2>
              <p className="rmx-hero-desc" style={{ color: '#555', marginBottom: '24px' }}>{config.description}</p>
              <button className="rmx-btn-primary" onClick={() => handleCta(config.ctaUrl)}>
                {config.cta || 'Explore Collection'}
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Full-width background video with overlay
  return (
    <section className="rmx-video-section">
      <div className="rmx-video-wrap">
        {config.videoUrl ? (
          <video
            ref={videoRef}
            src={config.videoUrl}
            poster={config.posterImage || undefined}
            autoPlay={config.autoplay}
            muted={config.muted !== false}
            loop={config.loop !== false}
            playsInline
            className="rmx-video-el"
          />
        ) : (
          <div className="rmx-video-placeholder" style={{ backgroundImage: config.posterImage ? `url('${config.posterImage}')` : undefined }} />
        )}
        <div className="rmx-video-overlay" />
        <div className="rmx-video-content">
          {config.eyebrow && <span className="rmx-hero-eyebrow">{config.eyebrow}</span>}
          {config.heading && <h2 className="rmx-video-heading">{config.heading}</h2>}
          {config.description && <p className="rmx-hero-desc">{config.description}</p>}
          <div className="rmx-hero-actions" style={{ marginTop: '24px' }}>
            {config.cta && (
              <button className="rmx-btn-primary" onClick={() => handleCta(config.ctaUrl)}>
                {config.cta}
              </button>
            )}
            {config.videoUrl && (
              <button className="rmx-btn-outline" onClick={togglePlay}>
                {playing ? 'Pause' : 'Play Video'}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 5. SERVICE BENEFITS WIDGETS ─────────────────────────────────────────────
function ServiceBenefits({ section }) {
  const { widgetType = 'benefits_row', config = {} } = section;
  const items = config.items || [];
  const icons = { truck: <IconTruck />, return: <IconReturn />, support: <IconSupport /> };

  if (widgetType === 'benefits_grid') {
    return (
      <section className="rmx-section" style={{ background: '#f8f8f8' }}>
        <div className="rmx-section-inner">
          <div className="rmx-benefits-grid">
            {items.map((b) => (
              <div key={b.id} className="rmx-benefit-card">
                <div className="rmx-benefit-icon">{icons[b.icon] || <IconSupport />}</div>
                <h4 className="rmx-benefit-title">{b.title}</h4>
                <p className="rmx-benefit-desc">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Row with dividers (Default)
  return (
    <section className="rmx-benefits">
      <div className="rmx-benefits-inner">
        {items.map((b) => (
          <div key={b.id} className="rmx-benefit-item">
            <div className="rmx-benefit-icon">{icons[b.icon] || <IconSupport />}</div>
            <div className="rmx-benefit-text">
              <span className="rmx-benefit-title">{b.title}</span>
              <span className="rmx-benefit-desc">{b.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── 6. EDITORIAL BLOCKS WIDGETS ─────────────────────────────────────────────
function EditorialBlocks({ section, onNav }) {
  const { widgetType = 'editorial_split', config = {} } = section;
  const items = config.items || [];

  const handleCta = (url) => {
    if (!url) return;
    if (url.includes('gender=men')) onNav('collections', { colFilter: 'men' });
    else if (url.includes('gender=women')) onNav('collections', { colFilter: 'women' });
    else if (url.includes('gender=kids')) onNav('collections', { colFilter: 'kids' });
    else onNav('collections', { colFilter: 'all' });
  };

  if (widgetType === 'editorial_cards') {
    return (
      <section className="rmx-section">
        <div className="rmx-section-inner">
          <div className="rmx-editorial-cards-grid">
            {items.map((b) => (
              <div key={b.id} className="rmx-editorial-card">
                <div className="rmx-editorial-card-img" style={{ backgroundImage: `url('${b.image}')` }} />
                <div className="rmx-editorial-card-body">
                  <span className="rmx-hero-eyebrow" style={{ color: '#888' }}>{b.eyebrow}</span>
                  <h3>{b.heading}</h3>
                  <p>{b.description}</p>
                  <button className="rmx-btn-primary" onClick={() => handleCta(b.primaryCtaUrl)}>
                    {b.primaryCta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Alternating Split (Default)
  return (
    <section className="rmx-editorial">
      {items.map((b) => (
        <div key={b.id} className={`rmx-editorial-block ${b.layout === 'image-right' ? 'image-right' : ''}`}>
          <div className="rmx-editorial-img" style={{ backgroundImage: `url('${b.image}')` }} />
          <div className="rmx-editorial-content">
            {b.eyebrow && <span className="rmx-editorial-eyebrow">{b.eyebrow}</span>}
            <h2 className="rmx-editorial-heading">{b.heading}</h2>
            {b.description && <p className="rmx-editorial-desc">{b.description}</p>}
            <div className="rmx-editorial-actions">
              {b.primaryCta && (
                <button className="rmx-btn-primary" onClick={() => handleCta(b.primaryCtaUrl)}>
                  {b.primaryCta}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

// ─── 7. NEWSLETTER / COMMUNITY WIDGETS ───────────────────────────────────────
function CommunityNewsletterSection({ section, onNav }) {
  const { widgetType = 'community_gallery', config = {} } = section;
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  // Newsletter Centered Widget
  if (widgetType === 'newsletter_centered') {
    return (
      <section className="rmx-section rmx-newsletter-centered-section">
        <div className="rmx-section-inner" style={{ maxWidth: '680px', textAlign: 'center' }}>
          <span className="rmx-hero-eyebrow" style={{ color: '#000' }}>Stay in the loop</span>
          <h2 className="rmx-section-title" style={{ fontSize: '32px', margin: '8px 0 12px' }}>{config.heading || 'Join the Ramroxa Club'}</h2>
          <p className="rmx-hero-desc" style={{ color: '#666', margin: '0 auto 24px' }}>
            {config.description || 'Subscribe for early access to drops, private sales and exclusive footwear previews.'}
          </p>
          {submitted ? (
            <div className="rmx-newsletter-success">✓ Thank you for subscribing! Check your inbox soon.</div>
          ) : (
            <form onSubmit={handleSubmit} className="rmx-newsletter-form-inline">
              <input
                type="email"
                placeholder="Enter your email address..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="rmx-btn-primary">{config.cta || 'Subscribe'}</button>
            </form>
          )}
        </div>
      </section>
    );
  }

  // Newsletter Banner Widget (Dark Full-Width Strip)
  if (widgetType === 'newsletter_banner') {
    return (
      <section className="rmx-newsletter-dark-banner">
        <div className="rmx-section-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px', color: '#fff' }}>{config.heading || 'Get 10% Off Your First Order'}</h3>
            <p style={{ color: '#aaa', margin: 0, fontSize: '13px' }}>{config.description || 'Be the first to know about new arrivals and exclusive store drops.'}</p>
          </div>
          {submitted ? (
            <span style={{ color: '#22c55e', fontWeight: 600 }}>✓ Subscribed!</span>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="email"
                placeholder="Your email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ padding: '10px 16px', borderRadius: '999px', border: '1px solid #444', background: '#222', color: '#fff', fontSize: '13px', outline: 'none' }}
                required
              />
              <button type="submit" className="rmx-btn-primary" style={{ background: '#fff', color: '#000' }}>{config.cta || 'Join'}</button>
            </form>
          )}
        </div>
      </section>
    );
  }

  // Community Gallery Widget (Default)
  const images = config.images || [];
  return (
    <section className="rmx-community">
      <div className="rmx-community-header">
        <div className="rmx-community-title-wrap">
          <h2 className="rmx-community-heading">{config.heading || 'See our community'}</h2>
          <span className="rmx-community-subheading">{config.subheading || 'in modern silhouettes'}</span>
        </div>
        {config.description && <p className="rmx-community-desc">{config.description}</p>}
        {config.cta && (
          <a href={config.ctaUrl || 'https://instagram.com'} target="_blank" rel="noopener noreferrer" className="rmx-community-btn">
            {config.cta}
          </a>
        )}
      </div>

      <div className="rmx-community-gallery">
        {images.map((imgItem) => (
          <div
            key={imgItem.id}
            className="rmx-community-img"
            style={{ backgroundImage: `url('${imgItem.src}')` }}
            onClick={() => onNav('collections', { colFilter: 'all' })}
            role="button"
            tabIndex={0}
          />
        ))}
      </div>
    </section>
  );
}

// ─── MAIN HOMEPAGE COMPONENT ──────────────────────────────────────────────────
export default function RamroxaHomepage({ catalog = [], onOpenProduct = () => {}, onNav = () => {} }) {
  const [cmsConfig, setCmsConfig] = useState(DEFAULT_HOMEPAGE_CONFIG);

  useEffect(() => {
    const refresh = () => {
      setCmsConfig(loadHomepageConfig());
    };

    // Initial load
    refresh();

    // Listen to live CMS updates from Admin
    window.addEventListener('rmx-homepage-updated', refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);

    return () => {
      window.removeEventListener('rmx-homepage-updated', refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const sections = cmsConfig.sections || DEFAULT_HOMEPAGE_CONFIG.sections;

  return (
    <div className="rmx-homepage">
      {sections.map((section) => {
        if (!section.enabled) return null;

        switch (section.type) {
          case 'hero':
            return <HeroSection key={section.id} section={section} onNav={onNav} />;
          
          case 'bestsellers':
          case 'featured':
            return (
              <ProductsSection
                key={section.id}
                section={section}
                catalog={catalog}
                onOpenProduct={onOpenProduct}
                onNav={onNav}
              />
            );

          case 'categories':
            return <CategoriesSection key={section.id} section={section} onNav={onNav} />;

          case 'video':
            return <VideoSection key={section.id} section={section} onNav={onNav} />;

          case 'benefits':
            return <ServiceBenefits key={section.id} section={section} />;

          case 'editorial':
            return <EditorialBlocks key={section.id} section={section} onNav={onNav} />;

          case 'community':
            return <CommunityNewsletterSection key={section.id} section={section} onNav={onNav} />;

          default:
            return null;
        }
      })}
    </div>
  );
}
