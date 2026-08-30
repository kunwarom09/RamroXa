'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminInventoryPage from '../inventory/page';

export default function AdminPublishedStockRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Smooth client-side redirect to the consolidated Inventory page
    router.replace('/admin/inventory');
  }, [router]);

  return <AdminInventoryPage />;
}
