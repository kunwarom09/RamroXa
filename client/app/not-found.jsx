import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: '404 — Page Not Found | RamroXa Nepal',
  description: 'The page you are looking for does not exist or has been moved.',
  robots: {
    index: false,
    follow: false
  }
};

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '75vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
        textAlign: 'center',
        fontFamily: 'inherit',
        color: '#111'
      }}
    >
      <div style={{ maxWidth: 540, width: '100%' }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#888',
            display: 'block',
            marginBottom: 8
          }}
        >
          Error 404
        </span>
        <h1
          style={{
            fontSize: 'clamp(28px, 5vw, 42px)',
            fontWeight: 400,
            margin: '0 0 16px 0',
            letterSpacing: -0.5,
            lineHeight: 1.2
          }}
        >
          We couldn’t find that page.
        </h1>
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.6,
            color: '#666',
            margin: '0 0 32px 0'
          }}
        >
          The link you followed may be broken, or the product might have been updated or moved. Try searching our collection or explore popular outdoor gear below.
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'center',
            marginBottom: 36
          }}
        >
          <Link
            href="/"
            style={{
              padding: '12px 24px',
              backgroundColor: '#111',
              color: '#fff',
              borderRadius: 999,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: 0.3
            }}
          >
            Back to Homepage
          </Link>
          <Link
            href="/shop"
            style={{
              padding: '12px 24px',
              backgroundColor: '#f5f5f5',
              color: '#111',
              border: '1px solid #e0e0e0',
              borderRadius: 999,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: 0.3
            }}
          >
            Browse All Gear
          </Link>
        </div>

        <div style={{ borderTop: '1px solid #eee', paddingTop: 24, fontSize: 13, color: '#888' }}>
          <span>Popular categories: </span>
          <Link href="/shop?category=footwear" style={{ color: '#111', textDecoration: 'underline', margin: '0 6px' }}>
            Footwear & Hiking Shoes
          </Link>
          <span>•</span>
          <Link href="/shop?category=bags" style={{ color: '#111', textDecoration: 'underline', margin: '0 6px' }}>
            Travelling Backpacks
          </Link>
          <span>•</span>
          <Link href="/contact" style={{ color: '#111', textDecoration: 'underline', margin: '0 6px' }}>
            Contact Support
          </Link>
        </div>
      </div>
    </main>
  );
}
