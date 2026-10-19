import { SITE_URL } from '../config/seoConfig.js';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/shop', '/product/', '/contact', '/ramroxa-logo.png', '/uploads/'],
        disallow: [
          '/admin/',
          '/api/',
          '/cart',
          '/checkout',
          '/account',
          '/orders',
          '/order-confirmed',
          '/login',
          '/signup',
          '/forgot-password',
          '/reset-password',
          '/verify-email',
          '/*?*sort=*',
          '/*?*filter=*'
        ]
      }
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL
  };
}
