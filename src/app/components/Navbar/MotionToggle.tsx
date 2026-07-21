"use client";
import { useTranslations } from 'next-intl';
import { Zap, ZapOff } from 'lucide-react';
import { useMotionPreference } from '@/app/components/motion/MotionPreference';

export default function MotionToggle() {
    const t = useTranslations('Navbar');
    const { reduceMotion, toggle } = useMotionPreference();
    const label = reduceMotion ? t('enable-motion') : t('reduce-motion');

    return (
        <button
            type="button"
            className="Navbar-motion-toggle"
            onClick={toggle}
            aria-pressed={reduceMotion}
            aria-label={label}
            title={label}
        >
            {reduceMotion
                ? <ZapOff size={18} strokeWidth={1.75} aria-hidden />
                : <Zap size={18} strokeWidth={1.75} aria-hidden />}
        </button>
    );
}
