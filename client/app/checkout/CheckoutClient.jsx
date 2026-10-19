'use client';
import React from 'react';
import dynamic from 'next/dynamic';

const StoreApp = dynamic(() => import('../../components/StoreApp'), { ssr: false });

export default function CheckoutClient() {
  return <StoreApp initialView="checkout" />;
}
