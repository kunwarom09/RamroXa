import { SITE_NAME, DEFAULT_DESCRIPTION } from '../config/seoConfig.js';

export default function manifest() {
  return {
    name: `${SITE_NAME} — Outdoor Gear & Footwear Nepal`,
    short_name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0a0a0a',
    icons: [
      {
        src: '/ramroxa-logo.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/ramroxa-logo.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  };
}
