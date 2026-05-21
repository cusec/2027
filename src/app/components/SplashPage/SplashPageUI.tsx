"use client";
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { FileFolder, SponsorshipInterestButton } from '@/app/assets/FigmaSVGs';
import Calendar from "@/app/assets/calendar.png";
import Globe from "@/app/assets/globe.png";
import NavigationWindow from "@/app/assets/navigation_ui_window.png";
import NavigationWindowSkinny from "@/app/assets/navigation_ui_window_skinny.png";

// Sign up at formspree.io, create a form, and paste the endpoint here.
// e.g. "https://formspree.io/f/your_form_id"
const FORMSPREE_ENDPOINT = "";

const SPONSORSHIP_INTEREST_URL = "";

function openCtaLink(url: string) {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
}

export default function SplashPageUI() {
    const t = useTranslations('SplashPage');
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

    async function handleAttendanceSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!email) return;

        if (!FORMSPREE_ENDPOINT) {
            setStatus('success');
            setEmail('');
            return;
        }

        setStatus('submitting');
        try {
            const res = await fetch(FORMSPREE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (res.ok) {
                setStatus('success');
                setEmail('');
            } else {
                setStatus('error');
            }
        } catch {
            setStatus('error');
        }
    }

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
                        <form className="UI-cta-attendance" onSubmit={handleAttendanceSubmit} noValidate>
                            {status === 'success' ? (
                                <p className="UI-cta-attendance-success">{t('attendance-success')}</p>
                            ) : (
                                <div className="UI-cta-email">
                                    <input
                                        className="UI-cta-email-input"
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder={t('attendance-placeholder')}
                                        aria-label={t('attendance-label')}
                                        autoComplete="email"
                                        required
                                        disabled={status === 'submitting'}
                                    />
                                    <button
                                        className="UI-cta-email-submit"
                                        type="submit"
                                        disabled={status === 'submitting'}
                                    >
                                        {status === 'submitting' ? '...' : t('attendance-submit')}
                                    </button>
                                </div>
                            )}
                            {status === 'error' && (
                                <p className="UI-cta-attendance-error">{t('attendance-error')}</p>
                            )}
                        </form>
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
