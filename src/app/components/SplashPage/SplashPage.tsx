import Image from 'next/image';
import { preload } from 'react-dom';
import { getTranslations } from 'next-intl/server';
import { ExternalLinkIcon, FileFolder } from '@/app/assets/FigmaSVGs';
import ExternalLinkConfirm from './Windows/Shell/ExternalLinkConfirm';
import SplashJoinWaitlist from './Windows/Content/SplashJoinWaitlist';
import SplashAnimationLock from './SplashAnimationLock';
import VantaBirds from './VantaBirds';
import SplashWaveform from './SplashWaveform';
import SplashTitle from './SplashTitle';
import TaskbarClock from './Windows/Launchers/TaskbarClock';
import MontrealIcon from './Windows/Launchers/MontrealIcon';
import CalendarIcon from './Windows/Launchers/CalendarIcon';
import TaskbarWindows from './TaskbarWindows';
import { SplashWindowsProvider } from './SplashWindowsContext';

export default async function SplashPage() {
    const t = await getTranslations('SplashPage');

    preload('/assets/splash_bg.webp', { as: 'image', fetchPriority: 'high' });

    return (
        <>
            <SplashAnimationLock />
            <div className="splash-wrapper">

            <VantaBirds />

            <SplashWindowsProvider>
                <aside className="desktop-icons" aria-label="Quick links">
                    <ExternalLinkConfirm
                        href="https://2026.cusec.net/"
                        className="desktop-icon"
                    >
                        <FileFolder width={88} height={67} />
                        <span className="desktop-icon-label">
                            {t('edition-link')}
                            <ExternalLinkIcon className="external-link-icon" />
                        </span>
                    </ExternalLinkConfirm>
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
                            src="/assets/cusec_aero_logo.webp"
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

            <SplashWaveform />
            </div>
        </>
    );
}
