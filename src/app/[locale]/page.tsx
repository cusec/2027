import {useTranslations} from 'next-intl';
import LocaleSwitcher from '@/app/components/Navbar/LocaleSwitcher';

export default function HomePage() {
	const t = useTranslations('HomePage');

	return (
		<div className="p-6">
			<div className="mb-4">
				<LocaleSwitcher />
			</div>
			<h1 className="text-4xl font-bold text-green-600">{t('title')}</h1>
			<p>{t('description')}</p>
		</div>
	);
}
