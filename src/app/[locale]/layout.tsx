import type { Metadata } from 'next';
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

const localeMetadata: Record<string, Partial<Metadata>> = {
  'en-CA': {
    title: "CUSEC 2027 — Canadian University Software Engineering Conference",
    description:
      "CUSEC 2027 is the 26th annual Canadian University Software Engineering Conference — Canada's longest-running student-led software engineering conference, held in Montréal, QC in January 2027.",
    openGraph: {
      locale: "en_CA",
      title: "CUSEC 2027 — Canadian University Software Engineering Conference",
      description:
        "Join CUSEC 2027, the 26th annual student-led software engineering conference in Montréal, QC. Canada's premier student tech conference — January 2027.",
    },
  },
  'fr-CA': {
    title: "CUSEC 2027 — Conférence canadienne sur le génie logiciel",
    description:
      "CUSEC 2027 est la 26e édition de la Conférence canadienne sur le génie logiciel — la plus longue conférence étudiante en génie logiciel au Canada, à Montréal en janvier 2027.",
    openGraph: {
      locale: "fr_CA",
      title: "CUSEC 2027 — Conférence canadienne sur le génie logiciel",
      description:
        "Participez à CUSEC 2027, la 26e édition de la conférence étudiante en génie logiciel à Montréal, QC — janvier 2027.",
    },
  },
};

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params;
  return localeMetadata[locale] ?? localeMetadata['en-CA'];
}

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

export default async function LocaleLayout({children, params}: Props) {
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
