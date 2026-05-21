"use client";
import {useTranslations} from 'next-intl';
import Image from 'next/image';
import {FileFolder, SponsorshipInterestButton } from '@/app/assets/FigmaSVGs';
import Calendar from "@/app/assets/calendar.png";
import Globe from "@/app/assets/globe.png";
import NavigationWindow from "@/app/assets/navigation_ui_window.png";
import NavigationWindowSkinny from "@/app/assets/navigation_ui_window_skinny.png";

const ATTENDANCE_INTEREST_URL = "";
const SPONSORSHIP_INTEREST_URL = "";

function openCtaLink(url: string) {
    if (!url) {
        return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
}

export default function SplashPageUI() {
    const t = useTranslations('SplashPage');

    return (
        <div className="splash-UI">
            <Image className="splash-UI-bg splash-UI-bg-default" src={NavigationWindow} alt="NavigationWindow" priority />
            <Image className="splash-UI-bg splash-UI-bg-mobile" src={NavigationWindowSkinny} alt="NavigationWindow mobile" priority />
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
                        <Image className="UI-icon" src={Calendar} alt="Calendar icon" />
                        <p>Jan. 2027</p>
                    </button>
                    <button type="button" className="UI-item UI-item-location">
                        <Image className="UI-icon" src={Globe} alt="Globe icon" />
                        <p>Montreal, QC</p>
                    </button>
                    <div className="UI-cta">
                        <div className="UI-cta-email" role="group" aria-label="Email signup">
                            <input
                                className="UI-cta-email-input"
                                type="email"
                                placeholder="Email"
                                aria-label="Email address"
                                autoComplete="email"
                            />
                            <button className="UI-cta-email-submit" type="button">
                                Submit
                            </button>
                        </div>
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