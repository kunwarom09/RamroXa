import React from 'react';
import ProductClient from './ProductClient';
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  getProductSeoData,
  generateProductSchema,
  generateBreadcrumbSchema,
  sanitizeMetaDescription
} from '../../../config/seoConfig';

export async function generateMetadata({ params }) {
  const slug = params?.slug;
  const product = await getProductSeoData(slug);

  if (!product) {
    return {
      title: 'Product Not Found',
      description: 'The requested product could not be found in our outdoor and footwear catalog.',
      robots: { index: false, follow: false }
    };
  }

  const title = `${product.name} | Buy Online in Nepal`;
  const priceNpr =
    typeof product.price === 'number'
      ? (product.price > 10000 ? product.price / 100 : product.price)
      : typeof product.basePrice === 'number'
      ? (product.basePrice > 10000 ? product.basePrice / 100 : product.basePrice)
      : null;

  const priceText = priceNpr ? ` at Rs ${priceNpr.toLocaleString('en-IN')}` : '';
  const description = sanitizeMetaDescription(
    product.description ||
      `Buy ${product.name}${priceText} on ${SITE_NAME}. Authentic outdoor footwear, durable backpacks, fast delivery across Kathmandu & Nepal.`
  );

  const rawImages = (product.images || [])
    .map((img) => (typeof img === 'string' ? img : img?.url))
    .filter(Boolean);

  const images = rawImages.length > 0 ? rawImages : [DEFAULT_OG_IMAGE];
  const fullImages = images.map((img) =>
    img.startsWith('http') ? img : `${SITE_URL}${img.startsWith('/') ? '' : '/'}${img}`
  );

  const canonicalUrl = `${SITE_URL}/product/${product.slug}`;

  return {
    title,
    description,
    keywords: [
      product.name,
      product.brand || 'Humtto',
      product.productType || 'Footwear',
      'hiking shoes Nepal',
      'buy online Kathmandu',
      SITE_NAME
    ].filter(Boolean),
    alternates: {
      canonical: canonicalUrl
    },
    robots: {
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
      title,
      description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      locale: 'en_NP',
      type: 'website',
      images: fullImages.map((url) => ({
        url,
        width: 1200,
        height: 630,
        alt: product.name
      }))
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: fullImages
    }
  };
}

export default async function ProductDetailPage({ params }) {
  const slug = params?.slug;
  const product = await getProductSeoData(slug);

  const productSchema = product ? generateProductSchema(product) : null;
  const breadcrumbSchema = product
    ? generateBreadcrumbSchema([
        { name: 'Home', url: '/' },
        {
          name: product.categoryId === 'c_bags' ? 'Bags' : 'Footwear',
          url: `/shop?category=${product.categoryId === 'c_bags' ? 'bags' : 'footwear'}`
        },
        { name: product.name, url: `/product/${product.slug}` }
      ])
    : null;

  return (
    <>
      {productSchema && (
        <script
          type="application/ld+json"
          id={`product-schema-${slug}`}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        />
      )}
      {breadcrumbSchema && (
        <script
          type="application/ld+json"
          id={`breadcrumb-schema-${slug}`}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
      )}
      <ProductClient initialProductSlug={slug} />
    </>
  );
}
