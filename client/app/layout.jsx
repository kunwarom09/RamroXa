import './globals.css';
import './fig-tokens.css';
import './admin.css';

export const metadata = {
  title: 'Ramroxa — Objects for the everyday grid',
  description: 'Ramroxa storefront — premium wear for modern living. Ships across Nepal. COD, eSewa and Fonepay.',
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
