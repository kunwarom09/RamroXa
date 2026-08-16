import './globals.css';
import './fig-tokens.css';
import './admin.css';

export const metadata = {
  title: 'Zylo — Objects for the everyday grid',
  description: 'Zylo storefront — premium wear for modern living. Ships across Nepal. COD, eSewa and Fonepay.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
