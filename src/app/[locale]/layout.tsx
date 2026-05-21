import {NextIntlClientProvider, hasLocale} from 'next-intl';
import {setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {routing} from '@/i18n/routing';
import SplashPage from '@/app/components/SplashPage/SplashPage';
import Navbar from '@/app/components/Navbar/Navbar';
type Props = {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
};
 
export default async function LocaleLayout({children, params}: Props) {
  // Ensure that the incoming `locale` is valid
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
 
  return (
    <NextIntlClientProvider>
      <Navbar />
      <SplashPage />
    </NextIntlClientProvider>
  );
}