// ─── RAMROXA HOMEPAGE CMS SCHEMA & WIDGET CONFIGURATION ────────────────────
export const DEFAULT_HERO_IMAGE_1 = '/hero-slide-1.jpg';
export const DEFAULT_HERO_IMAGE_2 = '/hero-slide-2.jpg';

export const SECTION_WIDGET_TYPES = {
  hero: [
    { value: 'hero_overlay', label: 'Hero with Content Overlay (Split Bottom)' },
    { value: 'hero_fullwidth', label: 'Full-Width Hero (Centered Content)' },
    { value: 'hero_split', label: 'Split Hero (Image + Text Side-by-Side)' },
    { value: 'hero_image_only', label: 'Image-Only Banner' },
    { value: 'hero_carousel', label: 'Full-Width Multi-Slide Carousel' }
  ],
  featured: [
    { value: 'grid_4', label: '4-Column Product Grid' },
    { value: 'grid_3', label: '3-Column Product Grid' },
    { value: 'slider', label: 'Horizontal Product Slider' },
    { value: 'large_featured', label: 'Large Featured Product + Products' },
    { value: 'compact', label: 'Compact Product Cards' }
  ],
  bestsellers: [
    { value: 'grid_3', label: '3-Column Product Grid' },
    { value: 'grid_4', label: '4-Column Product Grid' },
    { value: 'slider', label: 'Horizontal Product Slider' },
    { value: 'carousel', label: 'Product Carousel' },
    { value: 'compact', label: 'Compact Product Cards' }
  ],
  categories: [
    { value: 'bento_3', label: 'Large Card + 2 Small Cards (Bento Grid)' },
    { value: 'grid_3', label: '3-Card Horizontal Grid' },
    { value: 'split', label: 'Split 2-Column Banner' },
    { value: 'fullwidth_banner', label: 'Full-Width Category Banner' },
    { value: 'slider', label: 'Horizontal Category Slider' }
  ],
  video: [
    { value: 'video_bg', label: 'Full-Width Video Background with Overlay' },
    { value: 'video_split', label: 'Split Video + Text Narrative' }
  ],
  benefits: [
    { value: 'benefits_row', label: '3-Column Horizontal Row' },
    { value: 'benefits_grid', label: 'Card Badges Grid' },
    { value: 'benefits_minimal', label: 'Minimal Text Strip' }
  ],
  editorial: [
    { value: 'editorial_split', label: 'Alternating Split Blocks' },
    { value: 'editorial_cards', label: 'Editorial Story Cards Grid' }
  ],
  community: [
    { value: 'community_gallery', label: 'Community Heading + Horizontal Gallery' },
    { value: 'newsletter_centered', label: 'Centered Newsletter Signup' },
    { value: 'newsletter_split', label: 'Split Lifestyle Image + Form' },
    { value: 'newsletter_banner', label: 'Full-Width Dark Banner Signup' },
    { value: 'newsletter_minimal', label: 'Minimal Inline Email Strip' }
  ]
};

export const DEFAULT_HOMEPAGE_CONFIG = {
  sections: [
    {
      id: 'sec_hero',
      name: 'Hero banner',
      type: 'hero',
      enabled: true,
      widgetType: 'hero_overlay',
      config: {
        autoplay: true,
        slideDuration: 6000,
        slides: [
          {
            id: 'slide-1',
            active: true,
            order: 1,
            image: DEFAULT_HERO_IMAGE_1,
            eyebrow: 'Footwear',
            heading: 'Premium wear\nfor modern living',
            description: 'Discover our new range of soft clothes made for your daily look and your best days with the finest fabrics.',
            primaryCta: 'See all collections',
            primaryCtaUrl: '/shop',
            secondaryCta: 'Contact us',
            secondaryCtaUrl: '/contact',
          },
          {
            id: 'slide-2',
            active: true,
            order: 2,
            image: DEFAULT_HERO_IMAGE_2,
            eyebrow: 'Footwear',
            heading: 'Premium wear\nfor modern living',
            description: 'Discover our new range of soft clothes made for your daily look and your best days with the finest fabrics.',
            primaryCta: 'See all collections',
            primaryCtaUrl: '/shop',
            secondaryCta: 'Contact us',
            secondaryCtaUrl: '/contact',
          }
        ]
      }
    },
    {
      id: 'sec_bestsellers',
      name: 'New arrivals / Top picks',
      type: 'bestsellers',
      enabled: true,
      widgetType: 'grid_3',
      config: {
        eyebrow: 'Top Picks',
        title: 'Best Sellers',
        tag: 'bestSelling',
        limit: 3,
        cta: 'View All',
        ctaUrl: '/shop'
      }
    },
    {
      id: 'sec_categories',
      name: 'Category spotlight',
      type: 'categories',
      enabled: true,
      widgetType: 'bento_3',
      config: {
        eyebrow: 'Collections',
        title: 'Shop by Categories',
        items: [
          {
            id: 'cat-men',
            title: 'MEN',
            heading: 'Built for Daily\nConfidence',
            image: '/assets/44312e50fe56c782.q.jpg',
            cta: 'Shop Men',
            url: '/shop?gender=men'
          },
          {
            id: 'cat-women',
            title: 'WOMEN',
            heading: 'Designed For\nModern Living',
            image: '/assets/7f7ad2764f25606b.q.jpg',
            cta: 'Shop Women',
            url: '/shop?gender=women'
          },
          {
            id: 'cat-kids',
            title: 'KIDS',
            heading: 'Comfort For\nEvery Adventure',
            image: '/assets/0ffbe14d4cba1d4a.q.jpg',
            cta: 'Shop Kids',
            url: '/shop?gender=kids'
          }
        ]
      }
    },
    {
      id: 'sec_video',
      name: 'Brand video narrative',
      type: 'video',
      enabled: true,
      widgetType: 'video_bg',
      config: {
        videoUrl: '',
        posterImage: '/assets/59a3737ee018272f.q.jpg',
        autoplay: false,
        muted: true,
        loop: true,
        eyebrow: 'THE RAMROXA WAY',
        heading: 'Move with Ramroxa',
        description: 'Step into style that moves with you. Engineered for comfort, designed for everyday elevation.',
        cta: 'Explore Collection',
        ctaUrl: '/shop'
      }
    },
    {
      id: 'sec_benefits',
      name: 'Service benefits',
      type: 'benefits',
      enabled: true,
      widgetType: 'benefits_row',
      config: {
        items: [
          { id: 'b1', icon: 'truck', title: 'FREE SHIPPING', desc: 'On orders over Rs 500' },
          { id: 'b2', icon: 'return', title: '5-DAY HASSLE-FREE RETURNS', desc: 'Easy returns within 5 days' },
          { id: 'b3', icon: 'support', title: 'CUSTOMER SUPPORT', desc: "We're here to help" }
        ]
      }
    },
    {
      id: 'sec_featured',
      name: 'Featured products',
      type: 'featured',
      enabled: true,
      widgetType: 'grid_4',
      config: {
        eyebrow: 'Hand-picked',
        title: 'Featured',
        tag: 'featured',
        limit: 8,
        cta: 'View All',
        ctaUrl: '/shop'
      }
    },
    {
      id: 'sec_editorial',
      name: 'Editorial blocks',
      type: 'editorial',
      enabled: true,
      widgetType: 'editorial_split',
      config: {
        items: [
          {
            id: 'ed-1',
            active: true,
            layout: 'image-left',
            image: '/assets/7f7ad2764f25606b.q.jpg',
            eyebrow: 'PREMIUM COLLECTION',
            heading: 'Modern essentials for him',
            description: 'Discover refined everyday pieces designed for modern living. Premium fabrics, precise cuts.',
            primaryCta: 'Explore Men',
            primaryCtaUrl: '/shop?gender=men',
            secondaryCta: '',
            secondaryCtaUrl: ''
          },
          {
            id: 'ed-2',
            active: true,
            layout: 'image-right',
            image: '/assets/ed11bf6e660fdaa2.q.jpg',
            eyebrow: 'EVERYDAY STYLE',
            heading: 'Modern looks for women',
            description: 'Timeless pieces that move from morning to evening effortlessly. Style meets substance.',
            primaryCta: 'Explore Women',
            primaryCtaUrl: '/shop?gender=women',
            secondaryCta: '',
            secondaryCtaUrl: ''
          },
          {
            id: 'ed-3',
            active: true,
            layout: 'image-left',
            image: '/assets/c2dbe0a9de9b2d4c.q.jpg',
            eyebrow: 'EASY STYLE',
            heading: 'Made for the next generation',
            description: 'Fun, durable and comfortable styles for growing adventurers. Built to keep up with them.',
            primaryCta: 'Explore Kids',
            primaryCtaUrl: '/shop?gender=kids',
            secondaryCta: '',
            secondaryCtaUrl: ''
          }
        ]
      }
    },
    {
      id: 'sec_community',
      name: 'Newsletter signup / Community',
      type: 'community',
      enabled: true,
      widgetType: 'community_gallery',
      config: {
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
          { id: 'ci-6', src: '/assets/c2dbe0a9de9b2d4c.q.jpg', url: '/shop' }
        ]
      }
    }
  ]
};

const STORAGE_KEY = 'rmx-homepage-config';

export function loadHomepageConfig() {
  if (typeof window === 'undefined') return DEFAULT_HOMEPAGE_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HOMEPAGE_CONFIG;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.sections) && parsed.sections.length > 0) {
      // Merge with defaults to ensure all config keys exist
      const mergedSections = parsed.sections.map(sec => {
        const defaultSec = DEFAULT_HOMEPAGE_CONFIG.sections.find(ds => ds.id === sec.id || ds.type === sec.type);
        return {
          ...defaultSec,
          ...sec,
          config: {
            ...(defaultSec?.config || {}),
            ...(sec.config || {})
          }
        };
      });

      // Add any missing default sections
      DEFAULT_HOMEPAGE_CONFIG.sections.forEach(ds => {
        if (!mergedSections.some(s => s.id === ds.id || s.type === ds.type)) {
          mergedSections.push(ds);
        }
      });

      return { sections: mergedSections };
    }
    return DEFAULT_HOMEPAGE_CONFIG;
  } catch (e) {
    console.error('Failed to parse homepage config from localStorage:', e);
    return DEFAULT_HOMEPAGE_CONFIG;
  }
}

export function saveHomepageConfig(config) {
  if (typeof window === 'undefined') return;
  try {
    const payload = JSON.stringify(config);
    localStorage.setItem(STORAGE_KEY, payload);
    // Dispatch local events so open tabs and storefront immediately update
    window.dispatchEvent(new CustomEvent('rmx-homepage-updated', { detail: config }));
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: payload }));
  } catch (e) {
    console.error('Failed to save homepage config to localStorage:', e);
  }
}

export function resetHomepageConfig() {
  if (typeof window === 'undefined') return DEFAULT_HOMEPAGE_CONFIG;
  try {
    localStorage.removeItem(STORAGE_KEY);
    saveHomepageConfig(DEFAULT_HOMEPAGE_CONFIG);
    return DEFAULT_HOMEPAGE_CONFIG;
  } catch {
    return DEFAULT_HOMEPAGE_CONFIG;
  }
}
