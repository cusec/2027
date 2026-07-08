"use client";
import { useEffect, useRef } from 'react';

type VantaEffect = { destroy: () => void; resize?: () => void };

export default function VantaBirds() {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let effect: VantaEffect | null = null;
        let cancelled = false;

        (async () => {
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
                scale: 0.5,
                scaleMobile: 1.0,
                backgroundAlpha: 0.0,
                color1: 0x255,
                birdSize: 1.5,
                wingSpan: 40.0,
                speedLimit: 3.0,
                separation: 0.0,
                alignment: 100.0,
                cohesion: 100.0,
                quantity: 1.0,
            });
            requestAnimationFrame(() => effect?.resize?.());
        })();

        return () => {
            cancelled = true;
            effect?.destroy();
        };
    }, []);

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
