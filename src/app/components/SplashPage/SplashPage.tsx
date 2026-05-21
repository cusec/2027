import Image from 'next/image';
import SplashPageUI from './SplashPageUI';

function WavyText({ text }: { text: string }) {
    return (
        <h1 className="splash-title" aria-label={text}>
            {Array.from(text).map((char, i) => (
                <span
                    key={i}
                    className="splash-title-char"
                    style={{ animationDelay: `${i * 0.12}s` }}
                    aria-hidden
                >
                    {char}
                </span>
            ))}
        </h1>
    );
}

export default function SplashPage() {
    return (
        <div className="splash-wrapper">
            <div className="main-splash-content">
                <div className="splash-title-wrapper">
                    <WavyText text="CUSEC" />
                    <div className="title-row">
                        <WavyText text="2027" />
                        {/* <video
                            className="splash-logo"
                            autoPlay
                            loop
                            muted
                            playsInline
                            preload="auto"
                            aria-label="CUSEC logo"
                        >
                            <source src="/logo_animated.webm" type="video/webm" />
                        </video> */}
                        <Image
                            className="splash-logo splash-title-char"
                            src="/assets/cusec_aero_logo.png"
                            alt="CUSEC logo"
                            width={146}
                            height={146}
                            priority
                        />
                    </div>
                </div>
                <div className="splash-ui-wrapper">
                    <SplashPageUI />
                </div>

            </div>
            <video
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
        </div>
    );
}

