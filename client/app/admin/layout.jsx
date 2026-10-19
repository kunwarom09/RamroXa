import React from 'react';
import AdminClientLayout from './AdminClientLayout';

export const metadata = {
  title: 'Admin Console | RamroXa ERP & Catalog Manager',
  description: 'RamroXa administrative control, catalog, orders, and ERP dashboard.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true
    }
  }
};

export default function AdminLayout({ children }) {
  return <AdminClientLayout>{children}</AdminClientLayout>;
}
