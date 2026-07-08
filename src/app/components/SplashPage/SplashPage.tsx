import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { FileFolder } from '@/app/assets/FigmaSVGs';
import SplashJoinWaitlist from './SplashJoinWaitlist';
import SplashAnimationLock from './SplashAnimationLock';
import VantaBirds from './VantaBirds';
import SplashTitle from './SplashTitle';

export default async function SplashPage() {
    const t = await getTranslations('SplashPage');

    return (
        <>
            <SplashAnimationLock />
            <div className="splash-wrapper">

            <VantaBirds />

            <aside className="desktop-icons" aria-label="Quick links">
                <a
                    href="https://2026.cusec.net/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="desktop-icon"
                >
                    <FileFolder width={88} height={67} />
                    <span>{t('edition-link')}</span>
                </a>
                <div className="desktop-icon">
                    <Image src="/assets/globe.png" alt="Globe icon" width={76} height={76} />
                    <span>Montreal, QC</span>
                </div>
                <div className="desktop-icon">
                    <Image src="/assets/calendar.png" alt="Calendar icon" width={72} height={72} />
                    <span>Jan. 2027</span>
                </div>
            </aside>

            {/* Main content */}
            <div className="main-splash-content">
                <SplashTitle />
                <SplashJoinWaitlist />
            </div>

            {/* Taskbar */}
            <div className="splash-taskbar" role="toolbar" aria-label="Taskbar">
                <div className="taskbar-left">
                    <Image
                        className="taskbar-logo"
                        src="/assets/cusec_aero_logo.png"
                        alt="CUSEC logo"
                        width={28}
                        height={28}
                    />
                    <span className="taskbar-conference-name">{t('title')}</span>
                </div>
            </div>

            <video
                className="splash-waveform"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                aria-hidden
            >
                <source src="/splash_waveform.webm" type="video/webm" />
            </video>
            </div>
        </>
    );
}
