import {getRequestConfig} from 'next-intl/server';
import {hasLocale} from 'next-intl';
import {routing} from './routing';
 
export default getRequestConfig(async ({requestLocale}) => {
  // Typically corresponds to the `[locale]` segment
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  // get the major language string, e.g, 'en', 'fr'
  const language = locale.split('-')[0];
 
  return {
    locale,
    messages: (await import(`../../messages/${language}.json`)).default
  };
});