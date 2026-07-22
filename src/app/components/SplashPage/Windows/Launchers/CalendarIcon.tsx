"use client";
import Win95Modal from '../Shell/Win95Modal';
import Countdown from '../Content/Countdown';
import { useSplashWindows } from '../../SplashWindowsContext';
import useIsPhone from '../useIsPhone';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const YEAR = 2027;
const MONTH = 0; // January (0-indexed)
const HIGHLIGHT_DAY = 7;

function buildCells() {
    const startDay = new Date(YEAR, MONTH, 1).getDay();
    const daysInMonth = new Date(YEAR, MONTH + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
}

function MonthCalendar() {
    const cells = buildCells();
    return (
        <div className="win95-calendar">
            <div className="calendar-header">January 2027</div>
            <div className="calendar-grid">
                {WEEKDAYS.map(w => (
                    <span key={w} className="calendar-dow">{w}</span>
                ))}
                {cells.map((d, i) => (
                    <span
                        key={i}
                        className={
                            'calendar-day' +
                            (d === HIGHLIGHT_DAY ? ' calendar-day--active' : '') +
                            (d === null ? ' calendar-day--empty' : '')
                        }
                    >
                        {d ?? ''}
                    </span>
                ))}
            </div>
        </div>
    );
}

export default function CalendarIcon() {
    const { windows, openWindow, closeWindow, minimizeWindow, focusWindow } = useSplashWindows();
    const calendar = windows.calendar;
    const isPhone = useIsPhone();

    function onCalendarIconClick() {
        if (!calendar.isOpen) {
            openWindow('calendar');
            return;
        }

        if (calendar.isMinimized) {
            openWindow('calendar');
            return;
        }

        if (isPhone) {
            focusWindow('calendar');
            return;
        }

        minimizeWindow('calendar');
    }

    return (
        <>
            <button type="button" className="desktop-icon" onClick={onCalendarIconClick}>
                <img src="/assets/calendar.webp" alt="Calendar icon" width={72} height={72} />
                <span>Jan 07, 2027</span>
            </button>

            {calendar.isOpen && (
                <Win95Modal
                    title="CUSEC 2027 Start Date"
                    onClose={() => closeWindow('calendar')}
                    onMinimize={() => minimizeWindow('calendar')}
                    onFocus={() => focusWindow('calendar')}
                    zIndex={calendar.zIndex}
                    minimized={calendar.isMinimized}
                    initialX={-130}
                    initialY={-60}
                >
                    <div className="calendar-modal">
                        <MonthCalendar />
                        <Countdown />
                    </div>
                </Win95Modal>
            )}
        </>
    );
}
