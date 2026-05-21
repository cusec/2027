"use client";
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { FileFolder, SponsorshipInterestButton } from '@/app/assets/FigmaSVGs';

const SPONSORSHIP_INTEREST_URL = "";

function openCtaLink(url: string) {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
}

export default function SplashPageUI() {
    const t = useTranslations('SplashPage');

    return (
        <div className="splash-UI">
            <Image className="splash-UI-bg splash-UI-bg-default" src="/assets/navigation_ui_window.png" alt="NavigationWindow" width={735} height={514} priority />
            <Image className="splash-UI-bg splash-UI-bg-mobile" src="/assets/navigation_ui_window_skinny.png" alt="NavigationWindow mobile" width={351} height={576} priority />
            <div className="UI-content">
                <div className="UI-nav">
                    <h4>{t('title')}</h4>
                    <div className="UI-nav-button-row">
                        <button className="UI-minimize-button" aria-label="Minimize window" />
                        <button className="UI-fullscreen-button" aria-label="Fullscreen window" />
                        <button className="UI-close-button" aria-label="Close window" />
                    </div>
                </div>
                <div className="UI-Items-Wrapped">
                    <a
                        href="https://2026.cusec.net/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="UI-item UI-item-edition"
                    >
                        <FileFolder className="UI-icon" />
                        <p>{t('edition-link')}</p>
                    </a>
                    <button type="button" className="UI-item UI-item-date">
                        <Image className="UI-icon" src="/assets/calendar.png" alt="Calendar icon" width={83} height={83} />
                        <p>Jan. 2027</p>
                    </button>
                    <button type="button" className="UI-item UI-item-location">
                        <Image className="UI-icon" src="/assets/globe.png" alt="Globe icon" width={89} height={89} />
                        <p>Montreal, QC</p>
                    </button>
                    <div className="UI-cta">
                        <button
                            type="button"
                            className="UI-cta-link"
                            aria-label="Sponsorship Interest Form"
                            onClick={() => openCtaLink(SPONSORSHIP_INTEREST_URL)}
                        >
                            <SponsorshipInterestButton width={500} height={45} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
