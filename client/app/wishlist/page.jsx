import React from 'react';
import WishlistClient from './WishlistClient';
import { SITE_NAME, constructMetadata } from '../../config/seoConfig';

export const metadata = constructMetadata({
  title: `Your Saved Wishlist | ${SITE_NAME}`,
  description: 'View and manage your saved outdoor items, shoes, and backpacks.',
  path: '/wishlist',
  noIndex: true
});

export default function WishlistPage() {
  return <WishlistClient />;
}
