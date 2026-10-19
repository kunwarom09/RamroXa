import React from 'react';
import CartClient from './CartClient';
import { SITE_NAME, constructMetadata } from '../../config/seoConfig';

export const metadata = constructMetadata({
  title: `Your Shopping Bag | ${SITE_NAME}`,
  description: 'Review your selected outdoor products, hiking gear, and clothing before proceeding to checkout.',
  path: '/cart',
  noIndex: true
});

export default function CartPage() {
  return <CartClient />;
}
