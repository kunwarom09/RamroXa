import fs from 'fs';
import path from 'path';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://ramroxa.com').replace(/\/$/, '');
export const SITE_NAME = 'RamroXa';
export const DEFAULT_TITLE = 'RamroXa — Outdoor Gear, Hiking Shoes & Backpacks Nepal';
export const DEFAULT_DESCRIPTION =
  'Shop authentic outdoor hiking shoes, waterproof travelling backpacks, trekking footwear and everyday essentials in Nepal. Quality craftsmanship, durable gear, fast delivery in Kathmandu and nationwide.';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/ramroxa-logo.png`;
export const LOCALE = 'en_NP';

export const BUSINESS_INFO = {
  name: 'RamroXa',
  legalName: 'RamroXa Outdoor & Apparel Pvt. Ltd.',
  url: SITE_URL,
  logo: `${SITE_URL}/ramroxa-logo.png`,
  email: 'support@ramroxa.com', // TODO: Update with real business email
  phone: '+977-9841234567', // TODO: Update with real business phone
  address: {
    streetAddress: 'New Road',
    addressLocality: 'Kathmandu',
    addressRegion: 'Bagmati',
    postalCode: '44600',
    addressCountry: 'NP'
  },
  geo: {
    latitude: '27.7029',
    longitude: '85.3123'
  },
  openingHours: 'Mo-Sa 09:00-19:00',
  priceRange: 'NPR 1000 - NPR 35000',
  socialProfiles: [
    'https://www.facebook.com/ramroxa', // TODO: Update with real profile
    'https://www.instagram.com/ramroxa', // TODO: Update with real profile
    'https://twitter.com/ramroxa', // TODO: Update with real profile
    'https://www.tiktok.com/@ramroxa' // TODO: Update with real profile
  ]
};

/**
 * Normalizes text to 140-160 characters for meta descriptions.
 */
export function sanitizeMetaDescription(text, fallback = DEFAULT_DESCRIPTION) {
  if (!text || typeof text !== 'string') return fallback;
  const clean = text
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= 160) return clean;
  return clean.slice(0, 157).trim() + '...';
}

/**
 * Standardized SEO metadata constructor for Next.js 14 App Router pages.
 */
export function constructMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '',
  image = DEFAULT_OG_IMAGE,
  noIndex = false,
  type = 'website',
  keywords = [
    'hiking shoes Nepal',
    'outdoor backpack Nepal',
    'trekking gear Kathmandu',
    'Humtto shoes Nepal',
    'waterproof bag Kathmandu',
    'RamroXa'
  ]
} = {}) {
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const canonicalUrl = `${SITE_URL}${cleanPath}`;
  const fullImageUrl = image.startsWith('http') ? image : `${SITE_URL}${image.startsWith('/') ? '' : '/'}${image}`;
  const formattedTitle = title
    ? (title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME} Nepal`)
    : DEFAULT_TITLE;
  const metaDesc = sanitizeMetaDescription(description);

  return {
    title: formattedTitle,
    description: metaDesc,
    keywords: keywords.join(', '),
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: canonicalUrl
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false
          }
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1
          }
        },
    openGraph: {
      title: formattedTitle,
      description: metaDesc,
      url: canonicalUrl,
      siteName: SITE_NAME,
      locale: LOCALE,
      type,
      images: [
        {
          url: fullImageUrl,
          width: 1200,
          height: 630,
          alt: formattedTitle
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title: formattedTitle,
      description: metaDesc,
      images: [fullImageUrl],
      creator: '@ramroxa' // TODO: Update with real Twitter handle
    }
  };
}

/**
 * Safely load all published products from local seed fallback or API.
 */
export async function getAllPublishedProducts() {
  // 1. Try local seed file first (fast, reliable for static sitemap and SSG)
  const candidateSeeds = [
    path.resolve(process.cwd(), '../server/seeds/products.json'),
    path.resolve(process.cwd(), 'server/seeds/products.json'),
    path.resolve(process.cwd(), 'seeds/products.json')
  ];

  for (const seedPath of candidateSeeds) {
    if (fs.existsSync(seedPath)) {
      try {
        const raw = fs.readFileSync(seedPath, 'utf8');
        const prods = JSON.parse(raw);
        if (Array.isArray(prods) && prods.length > 0) {
          return prods.filter((p) => p.status === 'published');
        }
      } catch (err) {
        console.warn('Could not parse local seeds file for SEO:', err.message);
      }
    }
  }

  // 2. Try fetching from backend API
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:5000';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${backendUrl}/api/products?limit=100`, {
      signal: controller.signal,
      next: { revalidate: 3600 }
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const list = data?.data || data?.products || data;
      if (Array.isArray(list)) return list.filter((p) => p.status === 'published');
    }
  } catch (apiErr) {
    // Backend offline or unreachable, return empty array safely
  }

  return [];
}

/**
 * Retrieve SEO information for a specific product by slug.
 */
export async function getProductSeoData(slug) {
  if (!slug) return null;
  const cleanSlug = String(slug).toLowerCase().trim();

  // Try API first
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:5000';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${backendUrl}/api/products/${cleanSlug}`, {
      signal: controller.signal,
      next: { revalidate: 3600 }
    });
    clearTimeout(timer);
    if (res.ok) {
      const json = await res.json();
      const prod = json?.data || json?.product || json;
      if (prod && prod.name) return prod;
    }
  } catch (e) {}

  // Fallback to local seeds
  const all = await getAllPublishedProducts();
  return all.find((p) => String(p.slug).toLowerCase() === cleanSlug) || null;
}

/**
 * Schema.org Organization JSON-LD
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BUSINESS_INFO.name,
    legalName: BUSINESS_INFO.legalName,
    url: BUSINESS_INFO.url,
    logo: BUSINESS_INFO.logo,
    email: BUSINESS_INFO.email,
    telephone: BUSINESS_INFO.phone,
    address: {
      '@type': 'PostalAddress',
      ...BUSINESS_INFO.address
    },
    sameAs: BUSINESS_INFO.socialProfiles
  };
}

/**
 * Schema.org WebSite JSON-LD with Sitelinks Searchbox
 */
export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/shop?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  };
}

/**
 * Schema.org LocalBusiness JSON-LD
 */
export function generateLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: BUSINESS_INFO.name,
    image: BUSINESS_INFO.logo,
    '@id': `${SITE_URL}#store`,
    url: SITE_URL,
    telephone: BUSINESS_INFO.phone,
    priceRange: BUSINESS_INFO.priceRange,
    address: {
      '@type': 'PostalAddress',
      ...BUSINESS_INFO.address
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: BUSINESS_INFO.geo.latitude,
      longitude: BUSINESS_INFO.geo.longitude
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '09:00',
        closes: '19:00'
      }
    ]
  };
}

/**
 * Schema.org BreadcrumbList JSON-LD
 */
export function generateBreadcrumbSchema(items = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url.startsWith('/') ? '' : '/'}${item.url}`
    }))
  };
}

/**
 * Schema.org Product JSON-LD with Offers, AggregateRating, and Reviews
 */
export function generateProductSchema(product) {
  if (!product) return null;

  const rawImages = (product.images || [])
    .map((img) => (typeof img === 'string' ? img : img?.url))
    .filter(Boolean);

  const images = rawImages.length > 0 ? rawImages : [DEFAULT_OG_IMAGE];
  const fullImages = images.map((img) =>
    img.startsWith('http') ? img : `${SITE_URL}${img.startsWith('/') ? '' : '/'}${img}`
  );

  const priceNpr =
    typeof product.price === 'number'
      ? (product.price > 10000 ? product.price / 100 : product.price)
      : typeof product.basePrice === 'number'
      ? (product.basePrice > 10000 ? product.basePrice / 100 : product.basePrice)
      : 1000;

  const inStock = product.status !== 'out_of_stock' && product.status !== 'archived';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: fullImages,
    description: sanitizeMetaDescription(product.description || product.desc || product.name),
    sku: product.sku || `RMX-${product.slug}`,
    mpn: product.sku || product.id,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'Humtto'
    },
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/product/${product.slug}`,
      priceCurrency: 'NPR',
      price: priceNpr.toFixed(2),
      priceValidUntil: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0],
      itemCondition: 'https://schema.org/NewCondition',
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: SITE_NAME
      }
    }
  };

  if (product.ratingAvg && product.ratingAvg > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(product.ratingAvg).toFixed(1),
      reviewCount: Number(product.ratingCount) || 1,
      bestRating: '5',
      worstRating: '1'
    };
  }

  return schema;
}
