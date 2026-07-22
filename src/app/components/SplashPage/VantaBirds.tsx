"use client";
import { useEffect, useRef } from 'react';
import { useMotionPreference } from '@/app/components/motion/MotionPreference';

type VantaEffect = { destroy: () => void; resize?: () => void };

export default function VantaBirds() {
    const ref = useRef<HTMLDivElement>(null);
    const { reduceMotion } = useMotionPreference();

    useEffect(() => {
        if (reduceMotion) return;

        let effect: VantaEffect | null = null;
        let cancelled = false;

        const start = async () => {
            const THREE = await import('three');
            const BIRDS = (await import('vanta/dist/vanta.birds.min')).default;
            if (cancelled || !ref.current) return;

            effect = BIRDS({
                el: ref.current,
                THREE,
                mouseControls: true,
                touchControls: true,
                gyroControls: false,
                minHeight: 200.0,
                minWidth: 200.0,
                scale: 1.00,
                scaleMobile: 1.0,
                backgroundAlpha: 0.0,
                color1: 0x255,
                birdSize: 1.5,
                wingSpan: 40.0,
                speedLimit: 3.0,
                separation: 1.00,
                alignment: 100.0,
                cohesion: 100.0,
                quantity: 1.0,
            });
            requestAnimationFrame(() => effect?.resize?.());
        };

        // defer the heavy three.js + vanta load until the browser is idle so it
        // doesn't compete with first paint and the rest of the splash render.
        let idleId: number | undefined;
        let timeoutId: number | undefined;
        const ric = window.requestIdleCallback;
        if (typeof ric === 'function') {
            idleId = ric(() => start(), { timeout: 2000 });
        } else {
            timeoutId = window.setTimeout(start, 200);
        }

        return () => {
            cancelled = true;
            if (idleId !== undefined) window.cancelIdleCallback?.(idleId);
            if (timeoutId !== undefined) window.clearTimeout(timeoutId);
            effect?.destroy();
        };
    }, [reduceMotion]);

    return (
        <div
            ref={ref}
            className="vanta-birds"
            aria-hidden
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 0,
            }}
        />
    );
}
