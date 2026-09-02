/** Deterministic art for a delegate: the splash page's waveform, drawn from their id. */

export const SIGNATURE_WIDTH = 1200;
export const SIGNATURE_HEIGHT = 260;

export interface SignatureLine {
  d: string;
  stroke: string;
  width: number;
  opacity: number;
  delay: number;
}

/** A speck of pixel dust, in a 0–100 square. */
export interface DustMote {
  x: number;
  y: number;
  s: number;
  o: number;
}

const hashSeed = (value: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

/** mulberry32 — identical across runtimes, so server and client agree. */
const makeRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const STROKES = [
  { stroke: "var(--v2-lime)", width: 3, opacity: 1 },
  { stroke: "var(--v2-mint-bright)", width: 2, opacity: 0.72 },
  { stroke: "var(--v2-teal)", width: 2, opacity: 0.6 },
  { stroke: "var(--v2-aqua)", width: 1.5, opacity: 0.48 },
  { stroke: "var(--v2-white)", width: 1, opacity: 0.34 },
];

const SAMPLES = 96;
const TAU = Math.PI * 2;

export function signatureFor(seedSource: string): SignatureLine[] {
  const random = makeRandom(hashSeed(seedSource || "cusec"));
  const mid = SIGNATURE_HEIGHT / 2;

  return STROKES.map((preset, index) => {
    const amplitude = 26 + random() * 54;
    const frequency = 1.4 + random() * 2.6;
    const overtone = frequency * (2 + random() * 2);
    const phase = random() * TAU;
    const overtonePhase = random() * TAU;
    const drift = (random() - 0.5) * 46;

    let d = "";
    for (let i = 0; i < SAMPLES; i += 1) {
      const t = i / (SAMPLES - 1);
      // Tapered at both ends, so the line reads as a burst rather than a band.
      const envelope = Math.sin(Math.PI * t) ** 0.8;
      const y =
        mid +
        drift * envelope +
        envelope *
          (amplitude * Math.sin(TAU * frequency * t + phase) +
            amplitude * 0.35 * Math.sin(TAU * overtone * t + overtonePhase));

      d += `${i === 0 ? "M" : "L"}${(t * SIGNATURE_WIDTH).toFixed(1)} ${y.toFixed(2)}`;
    }

    return { ...preset, d, delay: index * 90 };
  });
}

/** Dust that thins out as it falls away from the waveform. */
export function dustFor(seedSource: string, count = 170): DustMote[] {
  const random = makeRandom(hashSeed(`${seedSource || "cusec"}::dust`));

  return Array.from({ length: count }, () => {
    const fall = random() ** 1.9;
    return {
      x: Number((random() * 100).toFixed(2)),
      y: Number((4 + fall * 82).toFixed(2)),
      s: Number((0.16 + random() * 0.4).toFixed(3)),
      o: Number((0.5 - fall * 0.38 + random() * 0.16).toFixed(3)),
    };
  });
}
