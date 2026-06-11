"use client";

import * as React from "react";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";

const focusableDialogSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function isVisibleElement(element: HTMLElement) {
  return Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableDialogSelector)).filter(
    (element) => element.getAttribute("aria-hidden") !== "true" && isVisibleElement(element),
  );
}

interface UseDialogA11yOptions {
  isOpen?: boolean;
  onClose: () => void;
}

export function useDialogA11y({ isOpen = true, onClose }: UseDialogA11yOptions) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null);
  const { closeFromEscape } = useEscapeToClose({ isOpen, onClose });

  React.useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    window.setTimeout(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusableElements = getFocusableElements(dialog);
      const [firstFocusable] = focusableElements;
      const preferredFocusable = focusableElements.find((element) =>
        element.matches('[autofocus], [data-autofocus="true"], input:not([type="hidden"]), textarea, select'),
      );
      (preferredFocusable ?? firstFocusable ?? dialog).focus();
    }, 0);

    return () => {
      previouslyFocusedRef.current?.focus();
      previouslyFocusedRef.current = null;
    };
  }, [isOpen]);

  const handleDialogKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        closeFromEscape(event);
        return;
      }

      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusableElements = getFocusableElements(dialog);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    },
    [closeFromEscape],
  );

  return { dialogRef, handleDialogKeyDown };
}
