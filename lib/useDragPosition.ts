"use client";

import { useCallback, useRef, useState } from "react";
import { clamp } from "./image-tools";

export interface NormalizedPosition {
  x: number;
  y: number;
}

export function useDragPosition(initial: NormalizedPosition) {
  const targetRef = useRef<HTMLCanvasElement>(null);
  const [position, setPosition] = useState<NormalizedPosition>(initial);
  const draggingRef = useRef(false);

  const updateFromPoint = useCallback((clientX: number, clientY: number) => {
    const el = targetRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((clientY - rect.top) / rect.height, 0, 1);
    setPosition({ x, y });
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      draggingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      updateFromPoint(e.clientX, e.clientY);
    },
    [updateFromPoint]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!draggingRef.current) return;
      updateFromPoint(e.clientX, e.clientY);
    },
    [updateFromPoint]
  );

  const onPointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  return { targetRef, position, setPosition, onPointerDown, onPointerMove, onPointerUp };
}
