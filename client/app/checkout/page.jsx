import React from 'react';
import CheckoutClient from './CheckoutClient';
import { SITE_NAME, constructMetadata } from '../../config/seoConfig';

export const metadata = constructMetadata({
  title: `Secure Checkout | ${SITE_NAME}`,
  description: 'Complete your order securely with Cash on Delivery or digital payment in Nepal.',
  path: '/checkout',
  noIndex: true
});

export default function CheckoutPage() {
  return <CheckoutClient />;
}
