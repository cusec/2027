"use client";

import { useSplashWindows, type SplashWindowId } from './SplashWindowsContext';

const WINDOW_META: Record<SplashWindowId, { label: string; icon?: string }> = {
    calendar: { label: 'Calendar', icon: '/assets/calendar.webp' },
    map: { label: 'Map', icon: '/assets/globe.webp' },
    countdown: { label: 'Countdown' },
};

export default function TaskbarWindows() {
    const { windows, restoreWindow } = useSplashWindows();

    const minimizedWindows = (Object.keys(windows) as SplashWindowId[]).filter(
        id => windows[id].isOpen && windows[id].isMinimized,
    );

    if (minimizedWindows.length === 0) {
        return <div className="taskbar-window-list" aria-hidden="true" />;
    }

    return (
        <div className="taskbar-window-list" aria-label="Minimized windows" role="group">
            {minimizedWindows.map(id => {
                const meta = WINDOW_META[id];
                return (
                    <button
                        key={id}
                        type="button"
                        className="taskbar-window-item"
                        onClick={() => restoreWindow(id)}
                        aria-label={`Restore ${meta.label}`}
                    >
                        {meta.icon ? (
                            <img src={meta.icon} alt="" aria-hidden width={14} height={14} />
                        ) : (
                            <span className="taskbar-window-dot" aria-hidden>
                                C
                            </span>
                        )}
                        <span className="taskbar-window-label">{meta.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
