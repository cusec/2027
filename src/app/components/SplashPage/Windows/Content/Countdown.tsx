"use client";
import { useEffect, useState } from 'react';

export const CONFERENCE_DATE = new Date('2027-01-07T00:00:00');

function pad(n: number) {
    return String(n).padStart(2, '0');
}

export default function Countdown() {
    const [now, setNow] = useState<Date>(() => new Date());

    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(id);
    }, []);

    const diff = Math.max(0, CONFERENCE_DATE.getTime() - now.getTime());
    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor(diff / 3_600_000) % 24;
    const minutes = Math.floor(diff / 60_000) % 60;
    const seconds = Math.floor(diff / 1000) % 60;

    return (
        <div className="countdown">
            <p className="countdown-label">CUSEC 2027 starts in</p>
            <div className="countdown-grid" suppressHydrationWarning>
                <Unit value={String(days)} label="days" />
                <Unit value={pad(hours)} label="hrs" />
                <Unit value={pad(minutes)} label="min" />
                <Unit value={pad(seconds)} label="sec" />
            </div>
        </div>
    );
}

function Unit({ value, label }: { value: string; label: string }) {
    return (
        <div className="countdown-unit">
            <span className="countdown-value">{value}</span>
            <span className="countdown-name">{label}</span>
        </div>
    );
}
