declare module 'vanta/dist/vanta.birds.min' {
    const birds: (options: Record<string, unknown>) => { destroy: () => void };
    export default birds;
}

// three@0.134 ships no bundled types; we only pass it through to Vanta opaquely.
declare module 'three';
