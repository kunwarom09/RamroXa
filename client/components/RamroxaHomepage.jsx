'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Helpers ────────────────────────────────────────────────────────────────
const rs = (n) => 'Rs ' + (n || 0).toLocaleString('en-US');
const img = (h) => {
  if (!h) return '';
  if (String(h).startsWith('http') || String(h).startsWith('/') || String(h).startsWith('data:')) {
    return h;
  }
  return `/assets/${h}.q.jpg`;
};
const DEFAULT_HERO_IMAGE_1 = '/hero-slide-1.jpg';
const DEFAULT_HERO_IMAGE_2 = '/hero-slide-2.jpg';

// ─── DEFAULT CMS CONFIG ──────────────────────────────────────────────────────
const DEFAULT_CMS = {
  hero: {
    autoplay: true,
    slideDuration: 5000,
    slides: [
      {
        id: 'slide-1',
        active: true,
        order: 1,
        image: DEFAULT_HERO_IMAGE_1,
        mobileImage: DEFAULT_HERO_IMAGE_1,
        eyebrow: 'PREMIUM EVERYDAY',
        heading: 'Style made for\nevery move',
        description: 'Discover footwear and fashion designed for modern living. Crafted for comfort, built to last.',
        primaryCta: 'Shop Now',
        primaryCtaUrl: '/shop',
        secondaryCta: 'Explore Collection',
        secondaryCtaUrl: '/shop',
      },
      {
        id: 'slide-2',
        active: true,
        order: 2,
        image: DEFAULT_HERO_IMAGE_2,
        mobileImage: DEFAULT_HERO_IMAGE_2,
        eyebrow: 'NEW SEASON',
        heading: 'Move forward\nwith confidence',
        description: 'Step into the new season with footwear engineered for every terrain and every occasion.',
        primaryCta: 'Shop Footwear',
        primaryCtaUrl: '/shop',
        secondaryCta: 'View Lookbook',
        secondaryCtaUrl: '/shop',
      },
    ],
  },
  categories: {
    items: [
      {
        id: 'cat-men',
        active: true,
        order: 1,
        title: 'MEN',
        description: 'Modern essentials for him.',
        image: '/assets/dbacea851225e2bf.q.jpg',
        mobileImage: '/assets/dbacea851225e2bf.q.jpg',
        cta: 'Shop Men',
        url: '/shop?gender=men',
      },
      {
        id: 'cat-women',
        active: true,
        order: 2,
        title: 'WOMEN',
        description: 'Designed for everyday confidence.',
        image: '/assets/78948356fa487da5.q.jpg',
        mobileImage: '/assets/78948356fa487da5.q.jpg',
        cta: 'Shop Women',
        url: '/shop?gender=women',
      },
      {
        id: 'cat-kids',
        active: true,
        order: 3,
        title: 'KIDS',
        description: 'Comfort for every adventure.',
        image: '/assets/0ca944ebbae726b8.q.jpg',
        mobileImage: '/assets/0ca944ebbae726b8.q.jpg',
        cta: 'Shop Kids',
        url: '/shop?gender=kids',
      },
    ],
  },
  video: {
    active: true,
    videoUrl: '',
    posterImage: '/assets/44312e50fe56c782.q.jpg',
    mobilePoster: '/assets/44312e50fe56c782.q.jpg',
    autoplay: false,
    muted: true,
    loop: true,
    eyebrow: 'THE RAMROXA WAY',
    heading: 'Move with Ramroxa',
    description: 'Step into style that moves with you.',
    cta: 'Explore Collection',
    ctaUrl: '/shop',
  },
  benefits: {
    items: [
      { id: 'b1', icon: 'truck', title: 'FREE SHIPPING', desc: 'On orders over Rs 500' },
      { id: 'b2', icon: 'return', title: '5-DAY HASSLE-FREE RETURNS', desc: 'Easy returns within 5 days' },
      { id: 'b3', icon: 'support', title: 'CUSTOMER SUPPORT', desc: "We're here to help" },
    ],
  },
  featured: {
    limit: 8,
  },
  editorial: {
    items: [
      {
        id: 'ed-1',
        active: true,
        order: 1,
        layout: 'image-left',
        image: '/assets/7f7ad2764f25606b.q.jpg',
        mobileImage: '/assets/7f7ad2764f25606b.q.jpg',
        eyebrow: 'PREMIUM COLLECTION',
        heading: 'Modern essentials for him',
        description: 'Discover refined everyday pieces designed for modern living. Premium fabrics, precise cuts.',
        primaryCta: 'Explore Men',
        primaryCtaUrl: '/shop?gender=men',
        secondaryCta: '',
        secondaryCtaUrl: '',
      },
      {
        id: 'ed-2',
        active: true,
        order: 2,
        layout: 'image-right',
        image: '/assets/ed11bf6e660fdaa2.q.jpg',
        mobileImage: '/assets/ed11bf6e660fdaa2.q.jpg',
        eyebrow: 'EVERYDAY STYLE',
        heading: 'Modern looks for women',
        description: 'Timeless pieces that move from morning to evening effortlessly. Style meets substance.',
        primaryCta: 'Explore Women',
        primaryCtaUrl: '/shop?gender=women',
        secondaryCta: '',
        secondaryCtaUrl: '',
      },
      {
        id: 'ed-3',
        active: true,
        order: 3,
        layout: 'image-left',
        image: '/assets/c2dbe0a9de9b2d4c.q.jpg',
        mobileImage: '/assets/c2dbe0a9de9b2d4c.q.jpg',
        eyebrow: 'EASY STYLE',
        heading: 'Made for the next generation',
        description: 'Fun, durable and comfortable styles for growing adventurers. Built to keep up with them.',
        primaryCta: 'Explore Kids',
        primaryCtaUrl: '/shop?gender=kids',
        secondaryCta: '',
        secondaryCtaUrl: '',
      },
    ],
  },
  community: {
    heading: 'See our community',
    subheading: 'in modern silhouettes',
    description: 'Discover how our community styles their favourite pieces.',
    cta: 'Follow Us',
    ctaUrl: 'https://instagram.com',
    images: [
      { id: 'ci-1', src: '/assets/dbacea851225e2bf.q.jpg', url: '/shop' },
      { id: 'ci-2', src: '/assets/78948356fa487da5.q.jpg', url: '/shop' },
      { id: 'ci-3', src: '/assets/7f7ad2764f25606b.q.jpg', url: '/shop' },
      { id: 'ci-4', src: '/assets/ed11bf6e660fdaa2.q.jpg', url: '/shop' },
      { id: 'ci-5', src: '/assets/0ca944ebbae726b8.q.jpg', url: '/shop' },
      { id: 'ci-6', src: '/assets/c2dbe0a9de9b2d4c.q.jpg', url: '/shop' },
    ],
  },
};

function loadCms() {
  if (typeof window === 'undefined') return DEFAULT_CMS;
  try {
    const raw = localStorage.getItem('rmx-homepage-config');
    if (!raw) return DEFAULT_CMS;
    const parsed = JSON.parse(raw);
    // Deep merge with defaults to ensure new fields always exist
    return {
      hero: { ...DEFAULT_CMS.hero, ...parsed.hero, slides: parsed.hero?.slides || DEFAULT_CMS.hero.slides },
      categories: { ...DEFAULT_CMS.categories, ...parsed.categories, items: parsed.categories?.items || DEFAULT_CMS.categories.items },
      video: { ...DEFAULT_CMS.video, ...parsed.video },
      benefits: { ...DEFAULT_CMS.benefits, ...parsed.benefits, items: parsed.benefits?.items || DEFAULT_CMS.benefits.items },
      featured: { ...DEFAULT_CMS.featured, ...parsed.featured },
      editorial: { ...DEFAULT_CMS.editorial, ...parsed.editorial, items: parsed.editorial?.items || DEFAULT_CMS.editorial.items },
      community: { ...DEFAULT_CMS.community, ...parsed.community, images: parsed.community?.images || DEFAULT_CMS.community.images },
    };
  } catch {
    return DEFAULT_CMS;
  }
}

// ─── ICON COMPONENTS ─────────────────────────────────────────────────────────
function IconTruck() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h5l3 4v5h-8V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}
function IconReturn() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-4" />
    </svg>
  );
}
function IconSupport() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function IconChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ─── PRODUCT CARD (matches existing storefront card style) ────────────────────
function ProductCard({ product, onOpen }) {
  const best = product.labels?.bestSelling;
  const featured = product.labels?.featured;
  const badgeText = best ? '★ Best Seller' : featured ? '✦ Featured' : product.labels?.newArrival ? '✦ New Arrival' : '✦ Latest Drop';
  const priceNpr = product.basePrice !== undefined ? Math.round(product.basePrice / 100) : (product.price || 0);
  const mrpNpr = product.mrp !== undefined ? Math.round(product.mrp / 100) : 0;
  const compare = mrpNpr || priceNpr;
  const featuredImg = (product.images || []).find(i => i.isFeatured) || (product.images || [])[0];
  const imgSrc = featuredImg?.url || product.img1 || '';

  return (
    <div className="rmx-product-card" onClick={() => onOpen(product)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onOpen(product)}>
      <div className="rmx-product-img-wrap" style={{ backgroundImage: imgSrc ? `url('${imgSrc}')` : undefined }}>
        <span className={`rmx-product-badge ${best ? 'best-seller' : ''}`}>{badgeText}</span>
      </div>
      <div className="rmx-product-card-body">
        <span className="rmx-product-brand">{product.brand || 'Ramroxa'}</span>
        <span className="rmx-product-name">{product.name}</span>
        <div className="rmx-product-prices">
          <span className="rmx-price">{rs(priceNpr)}</span>
          {compare > priceNpr && <span className="rmx-compare">{rs(compare)}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── HERO SLIDER ──────────────────────────────────────────────────────────────
function HeroSlider({ config, onNav }) {
  const slides = (config.slides || []).filter(s => s.active).sort((a, b) => a.order - b.order);
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef(null);

  const goTo = useCallback((idx) => {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrent(idx);
      setTransitioning(false);
    }, 350);
  }, [transitioning]);

  const goNext = useCallback(() => goTo((current + 1) % slides.length), [current, slides.length, goTo]);
  const goPrev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, slides.length, goTo]);

  useEffect(() => {
    if (!config.autoplay || slides.length <= 1) return;
    timerRef.current = setInterval(goNext, config.slideDuration || 5000);
    return () => clearInterval(timerRef.current);
  }, [config.autoplay, config.slideDuration, goNext, slides.length]);

  if (!slides.length) return null;
  const slide = slides[current] || slides[0];

  const handleCta = (url) => {
    if (!url) return;
    if (url.startsWith('/shop')) {
      const gender = url.includes('?gender=') ? url.split('?gender=')[1] : null;
      if (gender) {
        onNav('collections', { colFilter: gender });
      } else {
        onNav('collections', { colFilter: 'all' });
      }
    } else if (url === '/contact') {
      onNav('contact');
    } else if (url.startsWith('http')) {
      window.open(url, '_blank');
    }
  };

  return (
    <section className="rmx-hero" aria-label="Hero banner">
      <div className={`rmx-hero-bg ${transitioning ? 'fading' : ''}`} style={{ backgroundImage: `url('${slide.image}')` }} />
      <div className="rmx-hero-overlay" />

      <div className="rmx-hero-content">
        {slide.eyebrow && <span className="rmx-hero-eyebrow">{slide.eyebrow}</span>}
        <h1 className="rmx-hero-heading">{slide.heading}</h1>
        {slide.description && <p className="rmx-hero-desc">{slide.description}</p>}
        <div className="rmx-hero-actions">
          {slide.primaryCta && (
            <button className="rmx-btn-primary" onClick={() => handleCta(slide.primaryCtaUrl)}>
              {slide.primaryCta}
            </button>
          )}
          {slide.secondaryCta && (
            <button className="rmx-btn-outline" onClick={() => handleCta(slide.secondaryCtaUrl)}>
              {slide.secondaryCta}
            </button>
          )}
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button className="rmx-hero-arrow rmx-hero-arrow-prev" onClick={goPrev} aria-label="Previous slide">
            <IconChevronLeft />
          </button>
          <button className="rmx-hero-arrow rmx-hero-arrow-next" onClick={goNext} aria-label="Next slide">
            <IconChevronRight />
          </button>
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
        </>
      )}
    </section>
  );
}

// ─── BEST SELLERS ─────────────────────────────────────────────────────────────
function BestSellers({ catalog, onOpenProduct, onNav }) {
  const products = catalog.filter(p => p.labels?.bestSelling).slice(0, 3);
  if (!products.length) return null;

  return (
    <section className="rmx-section rmx-bestsellers">
      <div className="rmx-section-inner">
        <div className="rmx-section-head">
          <div>
            <span className="rmx-section-eyebrow">Top Picks</span>
            <h2 className="rmx-section-title">Best Sellers</h2>
          </div>
          <button className="rmx-link-btn" onClick={() => onNav('collections', { colFilter: 'all', sortBy: 'bestselling' })}>
            View All →
          </button>
        </div>
        <div className="rmx-products-3col">
          {products.map((p, idx) => (
            <ProductCard key={p.id || idx} product={p} onOpen={() => onOpenProduct(p)} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── SHOP BY CATEGORY ─────────────────────────────────────────────────────────
function ShopByCategory({ config, onNav }) {
  const items = (config.items || []).filter(c => c.active).sort((a, b) => a.order - b.order);
  if (!items.length) return null;

  const handleCatClick = (url) => {
    if (url.includes('gender=men')) onNav('collections', { colFilter: 'men' });
    else if (url.includes('gender=women')) onNav('collections', { colFilter: 'women' });
    else if (url.includes('gender=kids')) onNav('collections', { colFilter: 'kids' });
    else onNav('collections', { colFilter: 'all' });
  };

  return (
    <section className="rmx-section rmx-categories">
      <div className="rmx-section-inner">
        <div className="rmx-section-head">
          <div>
            <span className="rmx-section-eyebrow">Collections</span>
            <h2 className="rmx-section-title">Shop by Category</h2>
          </div>
        </div>
        <div className="rmx-cat-grid">
          {items.map((cat) => (
            <div key={cat.id} className="rmx-cat-card" onClick={() => handleCatClick(cat.url)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleCatClick(cat.url)}>
              <div className="rmx-cat-img" style={{ backgroundImage: `url('${cat.image}')` }}>
                <div className="rmx-cat-overlay" />
                <div className="rmx-cat-content">
                  <h3 className="rmx-cat-title">{cat.title}</h3>
                  {cat.description && <p className="rmx-cat-desc">{cat.description}</p>}
                  <span className="rmx-cat-cta">{cat.cta}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── VIDEO SECTION ────────────────────────────────────────────────────────────
function VideoSection({ config, onNav }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  if (!config.active) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  };

  const handleCta = (url) => {
    if (!url) return;
    if (url.includes('/shop')) onNav('collections', { colFilter: 'all' });
    else if (url === '/contact') onNav('contact');
    else if (url.startsWith('http')) window.open(url, '_blank');
  };

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

// ─── SERVICE BENEFITS ────────────────────────────────────────────────────────
function ServiceBenefits({ config }) {
  const items = config.items || [];
  const icons = { truck: <IconTruck />, return: <IconReturn />, support: <IconSupport /> };

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

// ─── FEATURED PRODUCTS ───────────────────────────────────────────────────────
function FeaturedProducts({ catalog, config, onOpenProduct, onNav }) {
  const limit = config.limit || 8;
  const products = catalog.filter(p => p.labels?.featured).slice(0, limit);
  if (!products.length) return null;

  return (
    <section className="rmx-section rmx-featured">
      <div className="rmx-section-inner">
        <div className="rmx-section-head">
          <div>
            <span className="rmx-section-eyebrow">Hand-picked</span>
            <h2 className="rmx-section-title">Featured</h2>
          </div>
          <button className="rmx-link-btn" onClick={() => onNav('collections', { colFilter: 'all' })}>
            View All →
          </button>
        </div>
        <div className="rmx-products-grid">
          {products.map((p, idx) => (
            <ProductCard key={p.id || idx} product={p} onOpen={() => onOpenProduct(p)} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── EDITORIAL BLOCKS ────────────────────────────────────────────────────────
function EditorialBlocks({ config, onNav }) {
  const items = (config.items || []).filter(b => b.active).sort((a, b) => a.order - b.order);
  if (!items.length) return null;

  const handleCta = (url) => {
    if (!url) return;
    if (url.includes('gender=men')) onNav('collections', { colFilter: 'men' });
    else if (url.includes('gender=women')) onNav('collections', { colFilter: 'women' });
    else if (url.includes('gender=kids')) onNav('collections', { colFilter: 'kids' });
    else if (url.includes('/shop')) onNav('collections', { colFilter: 'all' });
    else if (url === '/contact') onNav('contact');
    else if (url.startsWith('http')) window.open(url, '_blank');
  };

  return (
    <section className="rmx-editorial">
      {items.map((block) => {
        const isImageLeft = block.layout === 'image-left';
        return (
          <div key={block.id} className={`rmx-editorial-block ${isImageLeft ? 'image-left' : 'image-right'}`}>
            <div className="rmx-editorial-img" style={{ backgroundImage: `url('${block.image}')` }} />
            <div className="rmx-editorial-content">
              {block.eyebrow && <span className="rmx-section-eyebrow">{block.eyebrow}</span>}
              {block.heading && <h2 className="rmx-editorial-heading">{block.heading}</h2>}
              {block.description && <p className="rmx-editorial-desc">{block.description}</p>}
              <div className="rmx-hero-actions">
                {block.primaryCta && (
                  <button className="rmx-btn-primary" onClick={() => handleCta(block.primaryCtaUrl)}>
                    {block.primaryCta}
                  </button>
                )}
                {block.secondaryCta && (
                  <button className="rmx-btn-outline" onClick={() => handleCta(block.secondaryCtaUrl)}>
                    {block.secondaryCta}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}

// ─── STAY CONNECTED ──────────────────────────────────────────────────────────
function StayConnected({ config }) {
  const images = config.images || [];

  const handleImageClick = (url) => {
    if (url && url.startsWith('http')) window.open(url, '_blank');
  };

  return (
    <section className="rmx-community">
      <div className="rmx-community-header">
        <div className="rmx-community-text">
          <h2 className="rmx-community-heading">
            {config.heading || 'Stay Connected'}
            {config.subheading && (
              <><br /><em>{config.subheading}</em></>
            )}
          </h2>
          {config.description && <p className="rmx-community-desc">{config.description}</p>}
          {config.cta && (
            <a
              href={config.ctaUrl || '#'}
              target={config.ctaUrl?.startsWith('http') ? '_blank' : undefined}
              rel="noreferrer"
              className="rmx-btn-primary"
              style={{ display: 'inline-block', textDecoration: 'none' }}
            >
              {config.cta}
            </a>
          )}
        </div>
      </div>
      {images.length > 0 && (
        <div className="rmx-community-gallery">
          {images.map((image) => (
            <div
              key={image.id}
              className="rmx-community-img"
              style={{ backgroundImage: `url('${image.src}')` }}
              onClick={() => handleImageClick(image.url)}
              role={image.url ? 'button' : undefined}
              tabIndex={image.url ? 0 : undefined}
              onKeyDown={e => e.key === 'Enter' && handleImageClick(image.url)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── SKELETON LOADER ──────────────────────────────────────────────────────────
function HomepageSkeleton() {
  return (
    <div className="rmx-skeleton-wrap">
      <div className="rmx-skeleton-hero" />
      <div className="rmx-section-inner" style={{ marginTop: 56 }}>
        <div className="rmx-skeleton-line" style={{ width: '160px', height: '14px', marginBottom: 12 }} />
        <div className="rmx-skeleton-line" style={{ width: '240px', height: '32px', marginBottom: 32 }} />
        <div className="rmx-products-3col">
          {[1, 2, 3].map(i => (
            <div key={i} className="rmx-skeleton-card">
              <div className="rmx-skeleton-img" />
              <div className="rmx-skeleton-line" style={{ width: '60%', height: 14, marginBottom: 8 }} />
              <div className="rmx-skeleton-line" style={{ width: '80%', height: 18 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN HOMEPAGE ────────────────────────────────────────────────────────────
export default function RamroxaHomepage({ catalog = [], onOpenProduct, onNav }) {
  const [cms, setCms] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load CMS config
  useEffect(() => {
    const config = loadCms();
    setCms(config);
    setLoading(false);
  }, []);

  // Listen for CMS updates from admin panel
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'rmx-homepage-config') {
        const config = loadCms();
        setCms(config);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const handleOpenProduct = useCallback((product) => {
    // Find product index in catalog and navigate to it
    const cat = catalog;
    const idx = cat.findIndex(p => p.id === product.id || p._id === product._id);
    if (idx >= 0) onOpenProduct(idx);
  }, [catalog, onOpenProduct]);

  if (loading) return <HomepageSkeleton />;
  if (!cms) return null;

  return (
    <div className="rmx-homepage">
      {/* 1. Hero */}
      <HeroSlider config={cms.hero} onNav={onNav} />

      {/* 2. Best Sellers */}
      <BestSellers catalog={catalog} onOpenProduct={handleOpenProduct} onNav={onNav} />

      {/* 3. Shop by Category */}
      <ShopByCategory config={cms.categories} onNav={onNav} />

      {/* 4. Video Section */}
      <VideoSection config={cms.video} onNav={onNav} />

      {/* 5. Service Benefits */}
      <ServiceBenefits config={cms.benefits} />

      {/* 6. Featured Products */}
      <FeaturedProducts catalog={catalog} config={cms.featured} onOpenProduct={handleOpenProduct} onNav={onNav} />

      {/* 7. Editorial Blocks */}
      <EditorialBlocks config={cms.editorial} onNav={onNav} />

      {/* 8. Stay Connected / Community */}
      <StayConnected config={cms.community} />
    </div>
  );
}
