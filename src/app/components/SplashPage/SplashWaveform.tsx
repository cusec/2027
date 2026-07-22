"use client";
import { useEffect, useRef } from 'react';
import { useMotionPreference } from '@/app/components/motion/MotionPreference';

export default function SplashWaveform() {
    const ref = useRef<HTMLVideoElement>(null);
    const { reduceMotion } = useMotionPreference();

    useEffect(() => {
        const video = ref.current;
        if (!video) return;
        if (reduceMotion) {
            video.pause();
        } else {
            void video.play().catch(() => {});
        }
    }, [reduceMotion]);

    return (
        <video
            ref={ref}
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
    );
}
