"use client";
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Props = {
    title: string;
    onClose: () => void;
    onMinimize?: () => void;
    onFocus?: () => void;
    zIndex?: number;
    minimized?: boolean;
    children: React.ReactNode;
    resizable?: boolean;
    initialWidth?: number;
    initialHeight?: number;
    initialX?: number;
    initialY?: number;
    minWidth?: number;
    minHeight?: number;
};

export default function Win95Modal({
    title,
    onClose,
    onMinimize,
    onFocus,
    zIndex,
    minimized = false,
    children,
    resizable = false,
    initialWidth = 440,
    initialHeight = 360,
    initialX = 0,
    initialY = 0,
    minWidth = 280,
    minHeight = 220,
}: Props) {
    const [pos, setPos] = useState({ x: initialX, y: initialY });
    const [size, setSize] = useState<{ w: number; h: number } | null>(
        resizable ? { w: initialWidth, h: initialHeight } : null,
    );
    const drag = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
    const resize = useRef<{ startX: number; startY: number; baseW: number; baseH: number } | null>(null);

    useEffect(() => {
        if (minimized) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, minimized]);

    if (minimized) {
        return null;
    }

    function onTitlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
        if ((e.target as HTMLElement).closest('.win95-close, .win95-minimize')) return;
        onFocus?.();
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

    function onResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        const s = size ?? { w: initialWidth, h: initialHeight };
        resize.current = { startX: e.clientX, startY: e.clientY, baseW: s.w, baseH: s.h };
    }

    function onResizePointerMove(e: React.PointerEvent<HTMLDivElement>) {
        const r = resize.current;
        if (!r) return;
        setSize({
            w: Math.max(minWidth, r.baseW + (e.clientX - r.startX)),
            h: Math.max(minHeight, r.baseH + (e.clientY - r.startY)),
        });
    }

    function onResizePointerUp(e: React.PointerEvent<HTMLDivElement>) {
        resize.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
    }

    const windowStyle: React.CSSProperties = {
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        ...(zIndex ? { zIndex } : null),
        ...(size ? { width: size.w, height: size.h } : null),
    };

    return createPortal(
        <div className="modal-overlay" style={zIndex ? { zIndex } : undefined}>
            <div
                className={`win95-window${resizable ? ' win95-window--resizable' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                style={windowStyle}
                onPointerDown={onFocus}
            >
                <div
                    className="win95-titlebar"
                    onPointerDown={onTitlePointerDown}
                    onPointerMove={onTitlePointerMove}
                    onPointerUp={onTitlePointerUp}
                >
                    <span className="win95-title">{title}</span>
                    <div className="win95-titlebar-actions">
                        {onMinimize && (
                            <button
                                type="button"
                                className="win95-minimize"
                                aria-label="Minimize"
                                onClick={onMinimize}
                            />
                        )}
                        <button
                            type="button"
                            className="win95-close"
                            aria-label="Close"
                            onClick={onClose}
                        >
                            ×
                        </button>
                    </div>
                </div>
                <div className="win95-body">{children}</div>
                {resizable && (
                    <div
                        className="win95-resize"
                        aria-hidden
                        onPointerDown={onResizePointerDown}
                        onPointerMove={onResizePointerMove}
                        onPointerUp={onResizePointerUp}
                    />
                )}
            </div>
        </div>,
        document.body,
    );
}
