"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, PenLine, Type } from "lucide-react";
import Button from "@/components/Button";
import { TYPED_SIGNATURE_FONT } from "@/lib/payslip-approval";

// Fixed drawing size (3:1); CSS scales it to the box. Small enough that a
// signature PNG stays far under the 64 KB limit.
const WIDTH = 600;
const HEIGHT = 200;
const INK = "#0f172a";
const PAPER = "#ffffff";

interface SignaturePadProps {
  /** Name drawn by "Type my name instead". */
  typedName: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  /** PNG data URL after each stroke or typed render; null when cleared. */
  onChange: (dataUrl: string | null) => void;
}

/**
 * Signature on a plain canvas with pointer events (mouse, pen or finger).
 * "Type my name instead" draws the signer name in a cursive system font, which
 * is also the keyboard path. The canvas is white so the signature reads on the
 * dark theme and on the PDF.
 */
export default function SignaturePad({ typedName, disabled, invalid, describedBy, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const onChangeRef = useRef(onChange);
  const [mode, setMode] = useState<"draw" | "typed">("draw");
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const blank = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    return ctx;
  }, []);

  const emit = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) onChangeRef.current(canvas.toDataURL("image/png"));
  }, []);

  useEffect(() => {
    blank();
  }, [blank]);

  // Typed signature: redrawn whenever the signer name changes.
  useEffect(() => {
    if (mode !== "typed") return;
    const ctx = blank();
    if (!ctx) return;
    const name = typedName.trim();
    if (!name) {
      setHasInk(false);
      onChangeRef.current(null);
      return;
    }
    let size = 72;
    ctx.font = `${size}px ${TYPED_SIGNATURE_FONT}`;
    while (ctx.measureText(name).width > WIDTH - 48 && size > 24) {
      size -= 4;
      ctx.font = `${size}px ${TYPED_SIGNATURE_FONT}`;
    }
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, WIDTH / 2, HEIGHT / 2);
    setHasInk(true);
    emit();
  }, [mode, typedName, blank, emit]);

  const pointAt = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * WIDTH) / rect.width,
      y: ((event.clientY - rect.top) * HEIGHT) / rect.height,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    // Drawing replaces a typed signature.
    const ctx = mode === "typed" ? blank() : event.currentTarget.getContext("2d");
    if (!ctx) return;
    if (mode === "typed") setMode("draw");
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const point = pointAt(event);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    // A tap leaves a dot.
    ctx.lineTo(point.x + 0.1, point.y + 0.1);
    ctx.stroke();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = event.currentTarget.getContext("2d");
    if (!ctx) return;
    const point = pointAt(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const finishStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setHasInk(true);
    emit();
  };

  const clear = () => {
    blank();
    setMode("draw");
    setHasInk(false);
    onChangeRef.current(null);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          aria-label="Signature pad. Draw with a mouse, pen or finger, or use Type my name instead."
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={`block aspect-[3/1] w-full touch-none select-none rounded-[var(--radius-md)] border bg-white ${
            invalid ? "border-red-500" : "border-[var(--border)]"
          } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-crosshair"}`}
        />
        {/* Guide line, outside the exported image. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-[72%] border-b border-dashed border-slate-300" />
        {!hasInk && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[78%] text-center text-[11px] text-slate-400">
            Sign above the line
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="ghost" icon={<Eraser className="h-4 w-4" aria-hidden="true" />} onClick={clear} disabled={disabled || !hasInk}>
          Clear
        </Button>
        {mode === "draw" ? (
          <Button type="button" size="sm" variant="ghost" icon={<Type className="h-4 w-4" aria-hidden="true" />} onClick={() => setMode("typed")} disabled={disabled}>
            Type my name instead
          </Button>
        ) : (
          <Button type="button" size="sm" variant="ghost" icon={<PenLine className="h-4 w-4" aria-hidden="true" />} onClick={clear} disabled={disabled}>
            Draw instead
          </Button>
        )}
        <span role="status" className="text-xs text-[var(--muted)]">
          {hasInk ? (mode === "typed" ? "Typed signature added." : "Signature added.") : "No signature yet."}
        </span>
      </div>
    </div>
  );
}
