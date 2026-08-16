import React from 'react';
import ProductForm from '../../../../components/admin/ProductForm';

export default function EditMasterProductPage({ params }) {
  const id = params?.id;
  return <ProductForm productId={id} />;
}
