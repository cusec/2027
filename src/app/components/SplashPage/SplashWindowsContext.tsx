"use client";

import { createContext, useContext, useRef, useState } from 'react';

export type SplashWindowId = 'calendar' | 'map' | 'countdown';

type SplashWindowState = {
    isOpen: boolean;
    isMinimized: boolean;
    zIndex: number;
};

type SplashWindowsRecord = Record<SplashWindowId, SplashWindowState>;

type SplashWindowsContextValue = {
    windows: SplashWindowsRecord;
    openWindow: (id: SplashWindowId) => void;
    closeWindow: (id: SplashWindowId) => void;
    minimizeWindow: (id: SplashWindowId) => void;
    restoreWindow: (id: SplashWindowId) => void;
    focusWindow: (id: SplashWindowId) => void;
};

const BASE_Z_INDEX = 120;

const initialWindowState: SplashWindowState = {
    isOpen: false,
    isMinimized: false,
    zIndex: BASE_Z_INDEX,
};

const SplashWindowsContext = createContext<SplashWindowsContextValue | null>(null);

function useSplashWindowsContext(): SplashWindowsContextValue {
    const context = useContext(SplashWindowsContext);
    if (!context) {
        throw new Error('useSplashWindows must be used within SplashWindowsProvider');
    }
    return context;
}

export function SplashWindowsProvider({ children }: { children: React.ReactNode }) {
    const [windows, setWindows] = useState<SplashWindowsRecord>({
        calendar: initialWindowState,
        map: initialWindowState,
        countdown: initialWindowState,
    });
    const topZIndexRef = useRef(BASE_Z_INDEX + 1);

    function getNextZIndex() {
        topZIndexRef.current += 1;
        return topZIndexRef.current;
    }

    function openWindow(id: SplashWindowId) {
        const nextZ = getNextZIndex();
        setWindows(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                isOpen: true,
                isMinimized: false,
                zIndex: nextZ,
            },
        }));
    }

    function closeWindow(id: SplashWindowId) {
        setWindows(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                isOpen: false,
                isMinimized: false,
            },
        }));
    }

    function minimizeWindow(id: SplashWindowId) {
        setWindows(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                isOpen: true,
                isMinimized: true,
            },
        }));
    }

    function restoreWindow(id: SplashWindowId) {
        openWindow(id);
    }

    function focusWindow(id: SplashWindowId) {
        setWindows(prev => {
            if (!prev[id].isOpen || prev[id].isMinimized) return prev;
            const nextZ = getNextZIndex();
            return {
                ...prev,
                [id]: {
                    ...prev[id],
                    zIndex: nextZ,
                },
            };
        });
    }

    const value: SplashWindowsContextValue = {
        windows,
        openWindow,
        closeWindow,
        minimizeWindow,
        restoreWindow,
        focusWindow,
    };

    return <SplashWindowsContext.Provider value={value}>{children}</SplashWindowsContext.Provider>;
}

export function useSplashWindows() {
    return useSplashWindowsContext();
}
