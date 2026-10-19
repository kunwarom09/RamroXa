import { constructMetadata } from '../../config/seoConfig';

export const metadata = constructMetadata({
  title: 'Forgot Password',
  description: 'Reset your RamroXa account password securely.',
  path: '/forgot-password',
  noIndex: true
});

export default function ForgotPasswordLayout({ children }) {
  return children;
}
