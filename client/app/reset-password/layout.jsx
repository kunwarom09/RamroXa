import { constructMetadata } from '../../config/seoConfig';

export const metadata = constructMetadata({
  title: 'Set New Password',
  description: 'Enter your new password to restore access to your RamroXa account.',
  path: '/reset-password',
  noIndex: true
});

export default function ResetPasswordLayout({ children }) {
  return children;
}
