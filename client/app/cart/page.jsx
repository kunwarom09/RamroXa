'use client';
import dynamic from 'next/dynamic';

const StoreApp = dynamic(() => import('../../components/StoreApp'), { ssr: false });

export default function CartPage() {
  return <StoreApp initialView="cart" />;
}
