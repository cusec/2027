"use client";
import { useEffect, useState } from 'react';
import Win95Modal from '../Shell/Win95Modal';
import Countdown from '../Content/Countdown';
import { useSplashWindows } from '../../SplashWindowsContext';

export default function TaskbarClock() {
    const [now, setNow] = useState<Date>(() => new Date());
    const { windows, openWindow, closeWindow, focusWindow } = useSplashWindows();
    const countdownWindow = windows.countdown;

    function onCountdownClick() {
        if (!countdownWindow.isOpen) {
            openWindow('countdown');
            return;
        }

        if (countdownWindow.isMinimized) {
            openWindow('countdown');
            return;
        }

        focusWindow('countdown');
    }

    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 30_000);
        return () => window.clearInterval(id);
    }, []);

    const dateLabel = now
        ? now.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
        : '';

    return (
        <>
            <button
                type="button"
                className="taskbar-clock"
                onClick={onCountdownClick}
                aria-label="Show countdown"
                suppressHydrationWarning
            >
                {dateLabel}
            </button>

            {countdownWindow.isOpen && (
                <Win95Modal
                    title="Countdown"
                    onClose={() => closeWindow('countdown')}
                    onFocus={() => focusWindow('countdown')}
                    zIndex={countdownWindow.zIndex}
                    minimized={countdownWindow.isMinimized}
                    initialX={20}
                    initialY={80}
                >
                    <Countdown />
                </Win95Modal>
            )}
        </>
    );
}
