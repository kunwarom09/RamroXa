import React, { Suspense } from 'react';
import ProductForm from '../../../../components/admin/ProductForm';

export default function EditMasterProductPage({ params }) {
  const id = params?.id;
  return (
    <Suspense fallback={
      <div className="page" style={{ padding: '60px 20px', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '36px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 500, margin: '0 0 8px' }}>Loading product details...</h2>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '13px', margin: 0 }}>Fetching master product and variant information.</p>
        </div>
      </div>
    }>
      <ProductForm productId={id} />
    </Suspense>
  );
}
