import React from 'react';
import ShopClient from './ShopClient';
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  constructMetadata,
  generateBreadcrumbSchema
} from '../../config/seoConfig';

export async function generateMetadata({ searchParams }) {
  const catParam = searchParams?.category;
  const isFootwear = catParam && (catParam.toLowerCase() === 'footwear' || catParam.toLowerCase() === 'shoes');
  const isBags = catParam && (catParam.toLowerCase() === 'bags' || catParam.toLowerCase() === 'backpacks');

  let title = `Shop All Outdoor Gear & Footwear | ${SITE_NAME} Nepal`;
  let description =
    'Browse our complete catalog of authentic outdoor hiking shoes, trekking boots, camping backpacks, and everyday essentials in Nepal.';

  if (isFootwear) {
    title = `Outdoor Hiking Shoes & Footwear | Buy Online in Nepal | ${SITE_NAME}`;
    description =
      'Explore durable outdoor hiking shoes, waterproof trail runners, and trekking footwear engineered for Himalayan trails and city commutes.';
  } else if (isBags) {
    title = `Lightweight Outdoor Travelling Backpacks & Bags | ${SITE_NAME} Nepal`;
    description =
      'Shop waterproof hiking bags, 30L-75L travelling backpacks, and durable camping packs with ergonomic load support across Nepal.';
  }

  // Canonical is always clean /shop to prevent query-string duplicate content indexing
  return constructMetadata({
    title,
    description,
    path: '/shop',
    image: DEFAULT_OG_IMAGE,
    keywords: [
      'hiking shoes Nepal',
      'outdoor footwear Kathmandu',
      'camping backpacks Nepal',
      'trekking gear shop Kathmandu',
      SITE_NAME
    ]
  });
}

export default function ShopPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Shop Collections', url: '/shop' }
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        id="shop-breadcrumb-schema"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <ShopClient />
    </>
  );
}
