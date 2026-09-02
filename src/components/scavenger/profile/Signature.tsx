import {
  SIGNATURE_HEIGHT,
  SIGNATURE_WIDTH,
  dustFor,
  signatureFor,
} from "./waveform";

interface SeedProps {
  seed: string;
}

/** Pixel dust on its own, for surfaces too small to carry the waveform. */
export const Dust = ({ seed }: SeedProps) => (
  <svg
    className="v2-sig__dust"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    aria-hidden="true"
    focusable="false"
  >
    {dustFor(seed).map((mote, index) => (
      <rect
        key={index}
        x={mote.x}
        y={mote.y}
        width={mote.s}
        height={mote.s}
        opacity={mote.o}
      />
    ))}
  </svg>
);

/** Decorative — the name beside it is what gets read out. */
const Signature = ({ seed }: SeedProps) => (
  <>
    <Dust seed={seed} />

    <svg
      className="v2-sig__wave"
      viewBox={`0 0 ${SIGNATURE_WIDTH} ${SIGNATURE_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {signatureFor(seed).map((line) => (
        <path
          key={line.d}
          d={line.d}
          fill="none"
          stroke={line.stroke}
          strokeWidth={line.width}
          strokeLinecap="round"
          opacity={line.opacity}
          pathLength={1}
          style={{ animationDelay: `${line.delay}ms` }}
        />
      ))}
    </svg>
  </>
);

export default Signature;
