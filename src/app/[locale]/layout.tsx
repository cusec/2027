import type { Metadata } from 'next';
import {NextIntlClientProvider, hasLocale} from 'next-intl';
import {setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import MusicProvider from '@/app/components/v2/Music/MusicProvider';
import V2ScrollToTop from '@/app/components/v2/Scroll/V2ScrollToTop';
import {routing} from '@/i18n/routing';

type Props = {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
};

const localeMetadata: Record<string, Partial<Metadata>> = {
  'en-CA': {
    title: {
      default:
        "CUSEC 2027 - Canadian University Software Engineering Conference",
      template: "%s | CUSEC 2027",
    },
    description:
      "CUSEC 2027 is the 26th annual Canadian University Software Engineering Conference - Canada's longest-running student-led software engineering conference, held in Montréal, QC in January 2027.",
    openGraph: {
      locale: "en_CA",
      title: "CUSEC 2027 - Canadian University Software Engineering Conference",
      description:
        "Join CUSEC 2027, the 26th annual student-led software engineering conference in Montréal, QC. Canada's premier student tech conference - January 2027.",
    },
  },
  'fr-CA': {
    title: {
      default:
        "CUSEC 2027 - Conférence universitaire canadienne en informatique et génie logiciel",
      template: "%s | CUSEC 2027",
    },
    description:
      "CUSEC 2027 est la 26e édition de la Conférence universitaire canadienne en informatique et génie logiciel - la plus longue conférence étudiante en génie logiciel au Canada, à Montréal en janvier 2027.",
    openGraph: {
      locale: "fr_CA",
      title:
        "CUSEC 2027 - Conférence universitaire canadienne en informatique et génie logiciel",
      description:
        "Participez à CUSEC 2027, la 26e édition de la conférence étudiante en informatique et génie logiciel à Montréal, QC - janvier 2027.",
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
      <V2ScrollToTop />
      {/* Owns the CUSEC.FM audio, so a track survives navigation between the
          landing page and the ticket flow. */}
      <MusicProvider>{children}</MusicProvider>
    </NextIntlClientProvider>
  );
}
