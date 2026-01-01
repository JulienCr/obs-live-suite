import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except:
  // - API routes (/api/*)
  // - Next.js internals (/_next/*)
  // - Static files (files with extensions like .js, .css, .png, etc.)
  // - Overlays (OBS browser sources, should not have locale prefix)
  matcher: [
    '/((?!api|_next|_vercel|overlays|.*\\..*).*)'
  ],
};
