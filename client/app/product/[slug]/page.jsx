'use client';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const StoreApp = dynamic(() => import('../../../components/StoreApp'), { ssr: false });

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params?.slug;

  return <StoreApp initialView="detail" initialProductSlug={slug} />;
}
