import React from 'react';
import OrdersClient from './OrdersClient';
import { SITE_NAME, constructMetadata } from '../../config/seoConfig';

export const metadata = constructMetadata({
  title: `Order History | ${SITE_NAME}`,
  description: 'View and track your current and past orders.',
  path: '/orders',
  noIndex: true
});

export default function OrdersPage() {
  return <OrdersClient />;
}
