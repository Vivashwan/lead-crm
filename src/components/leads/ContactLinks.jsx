import Link from '@mui/material/Link';
import { EMAIL_REGEX } from '../../constants/leads';

// Links are only built from values that pass validation; anything else renders as text.
export function EmailLink({ email }) {
  if (!email) return '—';
  if (!EMAIL_REGEX.test(email)) return email;
  return (
    <Link href={`mailto:${email}`} underline="hover">
      {email}
    </Link>
  );
}

export function PhoneLink({ mobile }) {
  if (!mobile) return '—';
  const dialable = mobile.replace(/[^\d+]/g, '');
  return (
    <Link href={`tel:${dialable}`} underline="hover">
      {mobile}
    </Link>
  );
}
