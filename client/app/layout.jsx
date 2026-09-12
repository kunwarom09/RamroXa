import './globals.css';
import './fig-tokens.css';
import './admin.css';

export const metadata = {
  title: 'Ramroxa — Thoughtfully Designed Essentials',
  description: 'Thoughtfully designed clothing, footwear and everyday essentials made for comfort, quality and lasting style. From Kathmandu to every corner of Nepal.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdn.hugeicons.com/fonts/css/rounded-stroke.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
