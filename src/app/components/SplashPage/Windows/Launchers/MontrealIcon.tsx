"use client";
import Win95Modal from '../Shell/Win95Modal';
import { useSplashWindows } from '../../SplashWindowsContext';
import useIsPhone from '../useIsPhone';

// shows downtown montreal location on map
const MAP_SRC =
    'https://www.openstreetmap.org/export/embed.html' +
    '?bbox=-73.98%2C45.40%2C-73.40%2C45.70&layer=mapnik&marker=45.5019%2C-73.5674';

export default function MontrealIcon() {
    const { windows, openWindow, closeWindow, minimizeWindow, focusWindow } = useSplashWindows();
    const mapWindow = windows.map;
    const isPhone = useIsPhone();

    function focusMapWindow() {
        focusWindow('map');
    }

    function onMapIconClick() {
        if (!mapWindow.isOpen) {
            openWindow('map');
            return;
        }

        if (mapWindow.isMinimized) {
            openWindow('map');
            return;
        }

        if (isPhone) {
            focusWindow('map');
            return;
        }

        minimizeWindow('map');
    }

    return (
        <>
            <button type="button" className="desktop-icon" onClick={onMapIconClick}>
                <img src="/assets/globe.webp" alt="Globe icon" width={76} height={76} />
                <span>Montreal, QC</span>
            </button>

            {mapWindow.isOpen && (
                <Win95Modal
                    title="Montréal, QC — Properties"
                    onClose={() => closeWindow('map')}
                    onMinimize={() => minimizeWindow('map')}
                    onFocus={() => focusWindow('map')}
                    zIndex={mapWindow.zIndex}
                    minimized={mapWindow.isMinimized}
                    resizable
                    initialWidth={440}
                    initialHeight={380}
                    initialX={120}
                    initialY={-30}
                    minWidth={320}
                    minHeight={300}
                >
                    <div className="location-map">
                        <div className="location-well">
                            {/* .location-frame clips OSM's footer bar; credit is kept below. */}
                            <div className="location-frame" onPointerDownCapture={focusMapWindow}>
                                <iframe
                                    title="Map of Montréal"
                                    src={MAP_SRC}
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    onFocus={focusMapWindow}
                                    onMouseEnter={focusMapWindow}
                                />
                            </div>
                        </div>
                        <p className="location-caption">Montréal, Québec, Canada · CUSEC 2027</p>
                        <p className="location-attribution">Map © OpenStreetMap contributors</p>
                    </div>
                </Win95Modal>
            )}
        </>
    );
}
