'use client';
import React, { Suspense } from 'react';
import ProductForm from '../../../../components/admin/ProductForm';

export default function NewMasterProductPage() {
  return (
    <Suspense fallback={
      <div className="page" style={{ padding: '60px 20px', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '36px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 500, margin: '0 0 8px' }}>Loading form...</h2>
        </div>
      </div>
    }>
      <ProductForm />
    </Suspense>
  );
}
