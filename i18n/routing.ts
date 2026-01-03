import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'as-needed',
  localeDetection: false  // Disable browser detection, always use defaultLocale
});

export type Locale = (typeof routing.locales)[number];
