'use client';
import dynamic from 'next/dynamic';

const StoreApp = dynamic(() => import('../../components/StoreApp'), { ssr: false });

export default function OrderConfirmedPage() {
  return <StoreApp initialView="confirmed" />;
}
