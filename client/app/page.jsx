import React from 'react';
import HomeClient from './HomeClient';
import {
  SITE_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  constructMetadata,
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateLocalBusinessSchema
} from '../config/seoConfig';

export const metadata = constructMetadata({
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  path: '/',
  keywords: [
    'hiking shoes Nepal',
    'outdoor backpack Kathmandu',
    'trekking gear Nepal',
    'Humtto shoes Kathmandu',
    'waterproof travelling bags',
    SITE_NAME
  ]
});

export default function HomePage() {
  const orgSchema = generateOrganizationSchema();
  const websiteSchema = generateWebSiteSchema();
  const localStoreSchema = generateLocalBusinessSchema();

  return (
    <>
      <script
        type="application/ld+json"
        id="home-organization-schema"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <script
        type="application/ld+json"
        id="home-website-schema"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        id="home-store-schema"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localStoreSchema) }}
      />
      <HomeClient />
    </>
  );
}
