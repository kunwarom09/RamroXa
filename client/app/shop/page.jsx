'use client';
import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';

const StoreApp = dynamic(() => import('../../components/StoreApp'), { ssr: false });

function ShopContent() {
  const searchParams = useSearchParams();
  const rawCat = searchParams?.get('category');
  const rawGender = searchParams?.get('gender');
  const filterCat = rawCat
    ? (rawCat.toLowerCase() === 'footwear' || rawCat.toLowerCase() === 'shoes' ? 'c_footwear' : rawCat)
    : 'all';
  const colFilter = rawGender ? rawGender.toLowerCase() : 'all';

  return (
    <StoreApp
      initialView="collections"
      initialFilterCategory={filterCat}
      initialColFilter={colFilter}
    />
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={null}>
      <ShopContent />
    </Suspense>
  );
}
