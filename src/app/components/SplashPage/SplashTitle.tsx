"use client";
import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { useMotionPreference } from '@/app/components/motion/MotionPreference';

const REPEL_RADIUS = 140;   // how close the cursor must be to nudge a letter (px)
const REPEL_STRENGTH = 20;  // max displacement at the cursor (px)

function Word({ text }: { text: string }) {
    return (
        <h1 className="splash-title" aria-label={text}>
            {Array.from(text).map((char, i) => (
                <span
                    key={i}
                    className="splash-title-char"
                    style={{ animationDelay: `${i * 0.12}s` }}
                    aria-hidden
                >
                    {/* inner span carries the repel transform so it composes with
                        the parent's idle wave animation instead of overriding it */}
                    <span className="splash-title-repel">{char}</span>
                </span>
            ))}
        </h1>
    );
}

export default function SplashTitle() {
    const rootRef = useRef<HTMLDivElement>(null);
    const { reduceMotion } = useMotionPreference();

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        if (reduceMotion) return;

        const repels = Array.from(
            root.querySelectorAll<HTMLElement>('.splash-title-repel'),
        );
        if (!repels.length) return;

        let raf = 0;
        let mx = -99999;
        let my = -99999;
        let touchHolding = false; // on touch, only repel while a finger is held down

        const apply = () => {
            raf = 0;
            for (const el of repels) {

                const r = (el.parentElement as HTMLElement).getBoundingClientRect();
                const dx = r.left + r.width / 2 - mx;
                const dy = r.top + r.height / 2 - my;
                const dist = Math.hypot(dx, dy);

                if (dist < REPEL_RADIUS) {
                    const push = (1 - dist / REPEL_RADIUS) * REPEL_STRENGTH;
                    const inv = 1 / (dist || 1);
                    el.style.setProperty('--rx', `${dx * inv * push}px`);
                    el.style.setProperty('--ry', `${dy * inv * push}px`);
                } else {
                    el.style.setProperty('--rx', '0px');
                    el.style.setProperty('--ry', '0px');
                }
            }
        };

        const schedule = () => {
            if (!raf) raf = requestAnimationFrame(apply);
        };
        const reset = () => {
            mx = -99999;
            my = -99999;
            schedule();
        };

        const onPointerMove = (e: PointerEvent) => {
            if (e.pointerType === 'touch' && !touchHolding) return;
            mx = e.clientX;
            my = e.clientY;
            schedule();
        };
        const onPointerDown = (e: PointerEvent) => {
            if (e.pointerType !== 'touch') return;
            touchHolding = true;
            mx = e.clientX;
            my = e.clientY;
            schedule();
        };
        const onPointerUp = (e: PointerEvent) => {
            if (e.pointerType !== 'touch') return;
            touchHolding = false;
            reset();
        };

        window.addEventListener('pointermove', onPointerMove, { passive: true });
        window.addEventListener('pointerdown', onPointerDown, { passive: true });
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
        window.addEventListener('blur', reset);
        document.addEventListener('mouseleave', reset);

        return () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);
            window.removeEventListener('blur', reset);
            document.removeEventListener('mouseleave', reset);
            cancelAnimationFrame(raf);
        };
    }, [reduceMotion]);

    return (
        <div className="splash-title-wrapper" ref={rootRef}>
            <Word text="CUSEC" />
            <div className="title-row">
                <span className="splash-title-char">
                    <span className="splash-title-repel">
                        <Image
                            className="splash-logo"
                            src="/assets/cusec_aero_logo.webp"
                            alt="CUSEC logo"
                            width={146}
                            height={146}
                            priority
                        />
                    </span>
                </span>
                <Word text="2027" />
            </div>
        </div>
    );
}
