"use client";

import * as React from "react";
import {
  addEscapeLayer,
  createEscapeLayerId,
  isTopEscapeLayer,
  removeEscapeLayer,
} from "@/lib/escape-layer-stack";

type EscapeKeyboardEvent = KeyboardEvent | React.KeyboardEvent<HTMLElement>;

interface UseEscapeToCloseOptions {
  isOpen?: boolean;
  enabled?: boolean;
  onClose: () => void;
}

function stopEscapeEvent(event: EscapeKeyboardEvent) {
  event.preventDefault();
  event.stopPropagation();

  if ("nativeEvent" in event) {
    event.nativeEvent.stopImmediatePropagation?.();
  } else {
    event.stopImmediatePropagation?.();
  }
}

export function useEscapeToClose({
  isOpen = true,
  enabled = true,
  onClose,
}: UseEscapeToCloseOptions) {
  const layerIdRef = React.useRef<number | null>(null);
  const onCloseRef = React.useRef(onClose);

  if (layerIdRef.current === null) {
    layerIdRef.current = createEscapeLayerId();
  }

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const closeFromEscape = React.useCallback(
    (event?: EscapeKeyboardEvent) => {
      const layerId = layerIdRef.current;
      if (!enabled || !isOpen || layerId === null || !isTopEscapeLayer(layerId)) {
        return false;
      }

      if (event) {
        stopEscapeEvent(event);
      }

      onCloseRef.current();
      return true;
    },
    [enabled, isOpen],
  );

  React.useEffect(() => {
    const layerId = layerIdRef.current;
    if (!enabled || !isOpen || layerId === null) return;

    addEscapeLayer(layerId);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      closeFromEscape(event);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      removeEscapeLayer(layerId);
    };
  }, [closeFromEscape, enabled, isOpen]);

  return { closeFromEscape };
}
