import { constructMetadata } from '../../config/seoConfig';

export const metadata = constructMetadata({
  title: 'Verify Your Email Address',
  description: 'Verify your email address to activate your RamroXa customer account.',
  path: '/verify-email',
  noIndex: true
});

export default function VerifyEmailLayout({ children }) {
  return children;
}
