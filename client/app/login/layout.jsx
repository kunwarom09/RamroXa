import { constructMetadata } from '../../config/seoConfig';

export const metadata = constructMetadata({
  title: 'Sign In to Your Account',
  description: 'Log in to your RamroXa account to view orders, saved items, and account details.',
  path: '/login',
  noIndex: true
});

export default function LoginLayout({ children }) {
  return children;
}
