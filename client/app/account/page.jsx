import React from 'react';
import AccountClient from './AccountClient';
import { SITE_NAME, constructMetadata } from '../../config/seoConfig';

export const metadata = constructMetadata({
  title: `My Account | ${SITE_NAME}`,
  description: 'Manage your profile, shipping addresses, and preferences.',
  path: '/account',
  noIndex: true
});

export default function AccountPage() {
  return <AccountClient />;
}
