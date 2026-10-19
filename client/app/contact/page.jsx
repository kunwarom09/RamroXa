import React from 'react';
import ContactClient from './ContactClient';
import {
  SITE_NAME,
  constructMetadata,
  generateLocalBusinessSchema,
  generateBreadcrumbSchema
} from '../../config/seoConfig';

export const metadata = constructMetadata({
  title: `Contact Us | Customer Support & Store Location | ${SITE_NAME} Nepal`,
  description:
    'Need help with sizing, product availability, or order tracking? Contact the RamroXa team in Kathmandu. Fast customer support and inquiries across Nepal.',
  path: '/contact',
  keywords: ['contact RamroXa', 'outdoor store Kathmandu', 'customer support Nepal', 'hiking gear help']
});

export default function ContactPage() {
  const storeSchema = generateLocalBusinessSchema();
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Contact Us', url: '/contact' }
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        id="store-location-schema"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storeSchema) }}
      />
      <script
        type="application/ld+json"
        id="contact-breadcrumb-schema"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <ContactClient />
    </>
  );
}
