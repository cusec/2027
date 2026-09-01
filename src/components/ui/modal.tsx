"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
  simple?: boolean;
}

const Modal = ({
  isOpen,
  onClose,
  children,
  title,
  className,
  simple,
}: ModalProps) => {
  const [isClosing, setIsClosing] = React.useState(false);

  const handleClose = React.useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 150); // Match the animation duration
  }, [onClose]);

  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleClose]);

  if (!isOpen && !isClosing) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-45 flex items-center justify-center",
        isClosing
          ? "animate-out fade-out duration-200"
          : "animate-in fade-in duration-200"
      )}
    >
      {/* Backdrop */}
      <div
        className={cn(
          `absolute inset-0 bg-black/30 ${simple ? "" : "backdrop-blur-sm"}`,
          isClosing
            ? "animate-out fade-out duration-200"
            : "animate-in fade-in duration-200"
        )}
        onClick={handleClose}
      />

      {/* Modal Content — reset CSS vars so dark-bg modals keep light text */}
      <div
        className={cn(
          "v2-modal relative z-10 w-full max-w-2xl max-h-[70vh] overflow-y-auto bg-white rounded-lg shadow-xl",
          isClosing
            ? "animate-out fade-out zoom-out-95 duration-200"
            : "animate-in fade-in zoom-in-95 duration-200",
          className
        )}
        style={{
          // Pinned so a modal's own text colours never depend on whatever the
          // page behind it set. Values track the v2 palette; both pairings are
          // high contrast — ink-deep on white, and white on the dark panel.
          "--color-light-mode": "#F4FFFC",
          "--color-dark-mode": "#0E2318",
        } as React.CSSProperties}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
            <h2 className="v2-modal__title text-lg md:text-xl font-semibold">
              {title}
            </h2>
            {/* Opacity rather than a fixed grey: the old hover went *lighter*,
                which on a white panel dropped contrast instead of raising it,
                and it had to work on the dark admin panel too. */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close dialog"
              className="p-2 rounded-md text-current opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className={cn("p-6", title)}>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
