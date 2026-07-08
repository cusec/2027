"use client";
import { useEffect } from 'react';

/**
 * The entrance animation should play only once per browser session.
 *
 * A pre-paint inline script (in SplashPage) adds `splash-static` to <html> on a
 * refresh so the animation never even starts. This component handles the other
 * case: after the first-load animation finishes, it locks the session so a
 * client-side navigation within the same tab (e.g. switching languages) won't
 * replay it. <html> persists across client navigations, so the class sticks.
 */
export default function SplashAnimationLock() {
    useEffect(() => {
        const root = document.documentElement;
        if (root.classList.contains('splash-static')) return; // refresh — already locked
        const id = window.setTimeout(() => root.classList.add('splash-static'), 2200);
        return () => window.clearTimeout(id);
    }, []);

    return null;
}
