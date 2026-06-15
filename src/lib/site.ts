const FALLBACK_SITE_URL = 'https://askchetna.com';

export const SITE_NAME = 'AskChetna';
export const SITE_DESCRIPTION =
  'Understand patterns, not predictions. A calm, awareness-first approach to Vedic Astrology and planetary timing.';
export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || FALLBACK_SITE_URL
);

function normalizeSiteUrl(url: string) {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function absoluteUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalizedPath, SITE_URL).toString();
}
