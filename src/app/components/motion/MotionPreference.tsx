"use client";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';

/**
 * Motion preference: the single source of truth for whether animations should
 * be reduced. Animations are ON by default; the navbar toggle flips them off
 * and the choice persists across refreshes in localStorage. The OS
 * `prefers-reduced-motion` setting is intentionally NOT consulted.
 *
 * localStorage key `cusecReduceMotion`: '1' = reduce, anything else / absent =
 * full motion.
 */

const STORAGE_KEY = 'cusecReduceMotion';

type MotionContextValue = {
    reduceMotion: boolean;
    toggle: () => void;
};

const MotionContext = createContext<MotionContextValue | null>(null);

export function MotionPreferenceProvider({ children }: { children: React.ReactNode }) {
    const [reduceMotion, setReduceMotion] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        let stored: string | null = null;
        try {
            stored = localStorage.getItem(STORAGE_KEY);
        } catch {}
        setReduceMotion(stored === '1');
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        document.documentElement.classList.toggle('reduce-motion', reduceMotion);
    }, [hydrated, reduceMotion]);

    const toggle = useCallback(() => {
        setReduceMotion(prev => {
            const next = !prev;
            try {
                localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
            } catch {}
            return next;
        });
    }, []);

    return (
        <MotionContext.Provider value={{ reduceMotion, toggle }}>
            {children}
        </MotionContext.Provider>
    );
}

export function useMotionPreference(): MotionContextValue {
    const ctx = useContext(MotionContext);
    if (!ctx) {
        throw new Error('useMotionPreference must be used within a MotionPreferenceProvider');
    }
    return ctx;
}
