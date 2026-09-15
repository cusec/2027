/**
 * Dock icons drawn on a 24px grid with square caps and mitred joins, so they
 * sit with the squared display face rather than against it.
 */

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "square" as const,
  strokeLinejoin: "miter" as const,
  "aria-hidden": true,
  focusable: "false" as const,
};

export const ScanIcon = () => (
  <svg {...base}>
    <path d="M4 9V4h5M15 4h5v5M4 15v5h5M15 20h5v-5" />
    <path d="M3 12h18" />
  </svg>
);

export const HuntIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="7" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    <rect x="10.4" y="10.4" width="3.2" height="3.2" fill="currentColor" stroke="none" />
  </svg>
);

export const ProfileIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M5 20l1.8-4.6h10.4L19 20" />
  </svg>
);

export const SubmitIcon = () => (
  <svg {...base}>
    <path d="M12 16V4M6.5 9.5L12 4l5.5 5.5" />
    <path d="M4 20h16" />
  </svg>
);

export const BagIcon = () => (
  <svg {...base}>
    <path d="M4 8h16v12H4z" />
    <path d="M4 8l2.2-4h11.6L20 8" />
    <path d="M10 12h4" />
  </svg>
);

export const AdminIcon = () => (
  <svg {...base}>
    <path d="M4 6l8-3 8 3v6c0 4.4-3.6 7.6-8 9-4.4-1.4-8-4.6-8-9z" />
    <path d="M9 12l2.2 2.4L15.4 10" />
  </svg>
);

export const OutIcon = () => (
  <svg {...base}>
    <path d="M10 4H5v16h5" />
    <path d="M14 8l4 4-4 4" />
    <path d="M18 12H9" />
  </svg>
);
