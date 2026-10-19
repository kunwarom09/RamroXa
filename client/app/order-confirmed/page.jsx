import React from 'react';
import OrderConfirmedClient from './OrderConfirmedClient';
import { SITE_NAME, constructMetadata } from '../../config/seoConfig';

export const metadata = constructMetadata({
  title: `Order Confirmation | ${SITE_NAME}`,
  description: 'Thank you for your order. We are preparing your shipment.',
  path: '/order-confirmed',
  noIndex: true
});

export default function OrderConfirmedPage() {
  return <OrderConfirmedClient />;
}
