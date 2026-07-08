import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { FileFolder } from '@/app/assets/FigmaSVGs';
import SplashJoinWaitlist from './SplashJoinWaitlist';
import SplashAnimationLock from './SplashAnimationLock';

// Runs before first paint: if the splash has already been seen this session,
// mark <html> static so the entrance animation doesn't replay on refresh.
const SPLASH_ANIM_SCRIPT = `try{if(sessionStorage.getItem('cusecSplashSeen')){document.documentElement.classList.add('splash-static')}else{sessionStorage.setItem('cusecSplashSeen','1')}}catch(e){}`;

function WavyText({ text }: { text: string }) {
    return (
        <h1 className="splash-title" aria-label={text}>
            {Array.from(text).map((char, i) => (
                <span
                    key={i}
                    className="splash-title-char"
                    style={{ animationDelay: `${i * 0.12}s` }}
                    aria-hidden
                >
                    {char}
                </span>
            ))}
        </h1>
    );
}

export default async function SplashPage() {
    const t = await getTranslations('SplashPage');

    return (
        <>
            <script dangerouslySetInnerHTML={{ __html: SPLASH_ANIM_SCRIPT }} />
            <SplashAnimationLock />
            <div className="splash-wrapper">

            {/* Desktop icons — left side */}
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
                <div className="splash-title-wrapper">
                    <WavyText text="CUSEC" />
                    <div className="title-row">
                        <Image
                            className="splash-logo splash-title-char"
                            src="/assets/cusec_aero_logo.png"
                            alt="CUSEC logo"
                            width={146}
                            height={146}
                            priority
                        />
                        <WavyText text="2027" />
                    </div>
                </div>
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
