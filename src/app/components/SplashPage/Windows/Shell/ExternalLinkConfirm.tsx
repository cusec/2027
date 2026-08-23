"use client";
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';

type Props = {
    href: string;
    className?: string;
    children: ReactNode;
    'aria-label'?: string;
};

/**
 * Wraps an external link in a Win95-style "you are about to open a new tab"
 * confirmation. The rendered anchor keeps its real href + target so
 * middle-click, "open in new tab", and crawlers still work — we only
 * intercept a plain left-click to show the OK/Cancel dialog first.
 */
export default function ExternalLinkConfirm({
    href,
    className,
    children,
    'aria-label': ariaLabel,
}: Props) {
    const t = useTranslations('SplashPage');
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        if (!confirming) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setConfirming(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [confirming]);

    function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
        // let modifier/middle clicks (open-in-new-tab shortcuts) pass through
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
            return;
        }
        e.preventDefault();
        setConfirming(true);
    }

    function proceed() {
        setConfirming(false);
        window.open(href, '_blank', 'noopener,noreferrer');
    }

    return (
        <>
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
                aria-label={ariaLabel}
                onClick={onClick}
            >
                {children}
            </a>

            {confirming && createPortal(
                <div className="modal-overlay" onClick={() => setConfirming(false)}>
                    <div
                        className="win95-window win95-window--dialog"
                        role="alertdialog"
                        aria-modal="true"
                        aria-label={t('external-link-title')}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="win95-titlebar win95-titlebar--static">
                            <span className="win95-title">{t('external-link-title')}</span>
                            <button
                                type="button"
                                className="win95-close"
                                aria-label={t('external-link-cancel')}
                                onClick={() => setConfirming(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="win95-body win95-dialog-body">
                            <p className="win95-dialog-message">{t('external-link-message')}</p>
                            <div className="win95-dialog-actions">
                                <button
                                    type="button"
                                    className="win95-btn"
                                    autoFocus
                                    onClick={proceed}
                                >
                                    {t('external-link-confirm')}
                                </button>
                                <button
                                    type="button"
                                    className="win95-btn"
                                    onClick={() => setConfirming(false)}
                                >
                                    {t('external-link-cancel')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}
