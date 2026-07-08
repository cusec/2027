"use client";
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';

const SPONSORSHIP_URL = "https://forms.gle/TzbNoCKmALEYryLw7";

const LOADING_MESSAGES = [
    'Establishing connection…',
    'Data compaction second pass…',
    'Reticulating Cubear splines…',
    'Reserving your seat…',
    'Finalizing…',
];

export default function SplashJoinWaitlist() {
    const t = useTranslations('SplashPage');

    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorKind, setErrorKind] = useState<'' | 'generic' | 'duplicate'>('');
    const [msgIndex, setMsgIndex] = useState(0);

    // window drag state
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const drag = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

    function openModal() {
        setPos({ x: 0, y: 0 });
        setOpen(true);
    }

    function closeModal() {
        setOpen(false);
        setSubmitted(false);
        setErrorKind('');
        setEmail('');
    }

    function onTitlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
        if ((e.target as HTMLElement).closest('.win95-close')) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { startX: e.clientX, startY: e.clientY, baseX: pos.x, baseY: pos.y };
    }

    function onTitlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
        const d = drag.current;
        if (!d) return;
        setPos({ x: d.baseX + (e.clientX - d.startX), y: d.baseY + (e.clientY - d.startY) });
    }

    function onTitlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
        drag.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
    }

    // close the modal on 'esc'
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeModal();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    // cycle the retro loading messages while a submission is in flight
    useEffect(() => {
        if (!loading) {
            setMsgIndex(0);
            return;
        }
        const id = window.setInterval(
            () => setMsgIndex(i => (i + 1) % LOADING_MESSAGES.length),
            850,
        );
        return () => window.clearInterval(id);
    }, [loading]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!email || loading) return;
        setLoading(true);
        setErrorKind('');
        try {
            // keep the retro loader on screen for a beat even if the request is quick.
            const minDelay = new Promise(r => setTimeout(r, 2400));
            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            await minDelay;
            if (res.ok) {
                setSubmitted(true);
            } else if (res.status === 409) {
                setErrorKind('duplicate');
            } else {
                setErrorKind('generic');
            }
        } catch {
            setErrorKind('generic');
        } finally {
            setLoading(false);
        }
    }

    const modal = (
        <div className="modal-overlay" onClick={closeModal}>
            <div
                className="win95-window"
                role="dialog"
                aria-modal="true"
                aria-label={t('attendance-interest')}
                style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
                onClick={e => e.stopPropagation()}
            >
                <div
                    className="win95-titlebar"
                    onPointerDown={onTitlePointerDown}
                    onPointerMove={onTitlePointerMove}
                    onPointerUp={onTitlePointerUp}
                >
                    <span className="win95-title">
                        {loading ? 'Calculating…' : t('attendance-interest')}
                    </span>
                    <button
                        type="button"
                        className="win95-close"
                        aria-label="Close"
                        onClick={closeModal}
                    >
                        ×
                    </button>
                </div>

                <div className="win95-body">
                    {submitted ? (
                        <div className="waitlist-confirm">{t('attendance-success')}</div>
                    ) : loading ? (
                        <div className="waitlist-loading">
                            <p className="waitlist-loading-msg">{LOADING_MESSAGES[msgIndex]}</p>
                            <div className="xp-progress" aria-hidden>
                                <div className="xp-progress-fill" />
                            </div>
                        </div>
                    ) : (
                        <form className="waitlist-form" onSubmit={handleSubmit}>
                            <div className="waitlist-field">
                                <label htmlFor="waitlist-email">{t('attendance-label')}:</label>
                                <input
                                    id="waitlist-email"
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                    disabled={loading}
                                />
                            </div>
                            <button className="cta-btn" type="submit">
                                {t('attendance-submit')}
                            </button>
                            {errorKind && (
                                <p className="waitlist-error">
                                    {errorKind === 'duplicate'
                                        ? t('attendance-duplicate')
                                        : t('attendance-error')}
                                </p>
                            )}
                        </form>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <>
            <div className="cta-row">
                <a
                    className="cta-btn"
                    href={SPONSORSHIP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {t('sponsorship-interest')}
                </a>
                <button type="button" className="cta-btn" onClick={openModal}>
                    {t('attendance-submit')}
                </button>
            </div>

            {open && createPortal(modal, document.body)}
        </>
    );
}
