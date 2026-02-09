"use client";

import React, { useEffect, useRef, ReactNode } from "react";
import { X } from "lucide-react";

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title (required for accessibility) */
  title: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Modal content */
  children: ReactNode;
  /** Optional footer content (buttons, actions) */
  footer?: ReactNode;
  /** Size variant */
  size?: "sm" | "md" | "lg" | "xl";
  /** Whether clicking backdrop closes the modal (default: true) */
  closeOnBackdrop?: boolean;
  /** Whether ESC key closes the modal (default: true) */
  closeOnEsc?: boolean;
  /** Optional custom className for the modal content */
  className?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  closeOnBackdrop = true,
  closeOnEsc = true,
  className = "",
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, closeOnEsc, onClose]);

  // Focus trap and restoration
  useEffect(() => {
    if (!isOpen) return;

    // Store previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus the modal
    const modal = modalRef.current;
    if (modal) {
      modal.focus();
    }

    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      // Restore body scroll
      document.body.style.overflow = "";

      // Restore focus to previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen]);

  // Focus trap logic - keep focus within modal
  useEffect(() => {
    if (!isOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    function handleTab(event: KeyboardEvent) {
      if (event.key !== "Tab") return;

      const focusableElements = modal?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[
        focusableElements.length - 1
      ] as HTMLElement;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed left-64 top-0 right-0 bottom-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={subtitle ? "modal-description" : undefined}
    >
      {/* Backdrop - only covers content area, not sidebar */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`relative bg-[var(--card-surface)] rounded-lg shadow-xl w-full ${sizeClasses[size]} animate-slideUp ${className}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[var(--border)]">
          <div className="flex-1 pr-4">
            <h2
              id="modal-title"
              className="text-lg font-semibold text-[var(--foreground)]"
            >
              {title}
            </h2>
            {subtitle && (
              <p
                id="modal-description"
                className="mt-1 text-sm text-[var(--muted)]"
              >
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 -mt-2 -mr-2 rounded-md hover:bg-[var(--card-bg)] transition-colors text-[var(--muted)] hover:text-[var(--foreground)]"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border)] bg-[var(--card-bg)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
