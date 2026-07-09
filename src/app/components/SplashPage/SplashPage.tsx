import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { FileFolder } from '@/app/assets/FigmaSVGs';
import SplashJoinWaitlist from './Windows/Content/SplashJoinWaitlist';
import SplashAnimationLock from './SplashAnimationLock';
import VantaBirds from './VantaBirds';
import SplashTitle from './SplashTitle';
import TaskbarClock from './Windows/Launchers/TaskbarClock';
import MontrealIcon from './Windows/Launchers/MontrealIcon';
import CalendarIcon from './Windows/Launchers/CalendarIcon';
import TaskbarWindows from './TaskbarWindows';
import { SplashWindowsProvider } from './SplashWindowsContext';

export default async function SplashPage() {
    const t = await getTranslations('SplashPage');

    return (
        <>
            <SplashAnimationLock />
            <div className="splash-wrapper">

            <VantaBirds />

            <SplashWindowsProvider>
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
                    <MontrealIcon />
                    <CalendarIcon />
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
                    <TaskbarWindows />
                    <TaskbarClock />
                </div>
            </SplashWindowsProvider>

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
