import { constructMetadata } from '../../config/seoConfig';

export const metadata = constructMetadata({
  title: 'Create an Account',
  description: 'Join RamroXa to enjoy faster checkout, exclusive outdoor releases, and order tracking.',
  path: '/signup',
  noIndex: true
});

export default function SignupLayout({ children }) {
  return children;
}
