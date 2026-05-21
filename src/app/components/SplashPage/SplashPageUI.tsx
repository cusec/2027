"use client";
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { FileFolder, SponsorshipInterestButton } from '@/app/assets/FigmaSVGs';

const SPONSORSHIP_INTEREST_URL = "";

function openCtaLink(url: string) {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
}

export default function SplashPageUI() {
    const t = useTranslations('SplashPage');

    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const uiRef = useRef<HTMLDivElement>(null);
    const offsetRef = useRef({ x: 0, y: 0 });
    const dragOrigin = useRef({ x: 0, y: 0 });
    const bounds = useRef({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
    const isDragging = useRef(false);

    function onNavPointerDown(e: React.PointerEvent<HTMLDivElement>) {
        if ((e.target as HTMLElement).closest('button')) return;

        // Constrain the window to its container so it can't be lost off-screen.
        const el = uiRef.current;
        const container = el?.closest('.splash-wrapper');
        if (el && container) {
            const r = el.getBoundingClientRect();
            const c = container.getBoundingClientRect();
            const o = offsetRef.current;
            bounds.current = {
                minX: c.left - (r.left - o.x),
                maxX: c.right - (r.right - o.x),
                minY: c.top - (r.top - o.y),
                maxY: c.bottom - (r.bottom - o.y),
            };
        }

        isDragging.current = true;
        setDragging(true);
        dragOrigin.current = {
            x: e.clientX - offsetRef.current.x,
            y: e.clientY - offsetRef.current.y,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        e.preventDefault();
    }

    function onNavPointerMove(e: React.PointerEvent<HTMLDivElement>) {
        if (!isDragging.current) return;
        const b = bounds.current;
        const next = {
            x: Math.min(Math.max(e.clientX - dragOrigin.current.x, b.minX), b.maxX),
            y: Math.min(Math.max(e.clientY - dragOrigin.current.y, b.minY), b.maxY),
        };
        offsetRef.current = next;
        setOffset(next);
    }

    function onNavPointerUp(e: React.PointerEvent<HTMLDivElement>) {
        isDragging.current = false;
        setDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
    }

    return (
        <div
            ref={uiRef}
            className={`splash-UI${dragging ? ' splash-UI--dragging' : ''}`}
            style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
        >
            <Image className="splash-UI-bg splash-UI-bg-default" src="/assets/navigation_ui_window.png" alt="NavigationWindow" width={735} height={514} priority />
            <Image className="splash-UI-bg splash-UI-bg-mobile" src="/assets/navigation_ui_window_skinny.png" alt="NavigationWindow mobile" width={351} height={576} priority />
            <div className="UI-content">
                <div
                    className={`UI-nav${dragging ? ' UI-nav--dragging' : ''}`}
                    onPointerDown={onNavPointerDown}
                    onPointerMove={onNavPointerMove}
                    onPointerUp={onNavPointerUp}
                >
                    <h4>{t('title')}</h4>
                    <div className="UI-nav-button-row">
                        <button className="UI-minimize-button" aria-label="Minimize window" />
                        <button className="UI-fullscreen-button" aria-label="Fullscreen window" />
                        <button className="UI-close-button" aria-label="Close window" />
                    </div>
                </div>
                <div className="UI-Items-Wrapped">
                    <a
                        href="https://2026.cusec.net/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="UI-item UI-item-edition"
                    >
                        <FileFolder className="UI-icon" />
                        <p>{t('edition-link')}</p>
                    </a>
                    <button type="button" className="UI-item UI-item-date">
                        <Image className="UI-icon" src="/assets/calendar.png" alt="Calendar icon" width={83} height={83} />
                        <p>Jan. 2027</p>
                    </button>
                    <button type="button" className="UI-item UI-item-location">
                        <Image className="UI-icon" src="/assets/globe.png" alt="Globe icon" width={89} height={89} />
                        <p>Montreal, QC</p>
                    </button>
                    <div className="UI-cta">
                        <button
                            type="button"
                            className="UI-cta-link"
                            aria-label="Sponsorship Interest Form"
                            onClick={() => openCtaLink(SPONSORSHIP_INTEREST_URL)}
                        >
                            <SponsorshipInterestButton width={500} height={45} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
