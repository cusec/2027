"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useZxing } from "react-zxing";

interface ScannerPageProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (identifier: string) => void;
  onError?: (error: string) => void;
}

/** A full-screen takeover: the camera gets the whole viewport, not a panel. */
const ScannerPage = ({
  isOpen,
  onClose,
  onScanSuccess,
  onError,
}: ScannerPageProps) => {
  const { ref } = useZxing({
    onDecodeResult(result) {
      if (result) {
        const scannedText = result.getText();

        try {
          const url = new URL(scannedText);
          const identifier = url.searchParams.get("identifier");
          if (identifier) {
            // Only allow alphanumeric, dash, underscore, and max 64 chars
            const safeIdentifier = identifier.match(/^[a-zA-Z0-9_-]{1,64}$/);
            if (safeIdentifier) {
              onScanSuccess(identifier);
              onClose();
            } else {
              onError?.("Invalid identifier format in QR code.");
            }
          }
        } catch {
          // Nothing, keep scanning
        }
      }
    },
    constraints: {
      video: {
        facingMode: "environment",
      },
    },
  });

  useEffect(() => {
    if (!isOpen) return;

    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", escape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", escape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="aero-scan" role="dialog" aria-label="Scan a hunt item">
      <video ref={ref} className="aero-scan__feed" playsInline muted />

      <div className="aero-scan__bar">
        <p className="aero-scan__title">Scan a hunt item</p>
        <button
          type="button"
          onClick={onClose}
          className="aero-scan__close"
          aria-label="Close scanner"
        >
          <X size={20} />
        </button>
      </div>

      <div className="aero-scan__frame" aria-hidden="true" />

      <p className="aero-scan__hint">
        Point the camera at a CUSEC code. No feed? Check the camera permission
        for this site, or scan with your phone&apos;s camera app instead.
      </p>
    </div>
  );
};

export default ScannerPage;
