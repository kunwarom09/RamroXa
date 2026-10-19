import React from 'react';
import AccountOrdersClient from './AccountOrdersClient';
import { SITE_NAME, constructMetadata } from '../../../config/seoConfig';

export const metadata = constructMetadata({
  title: `My Orders | ${SITE_NAME}`,
  description: 'View your orders and shipments.',
  path: '/account/orders',
  noIndex: true
});

export default function AccountOrdersPage() {
  return <AccountOrdersClient />;
}
