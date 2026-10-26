import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type React from 'react';

/**
 * Lets a fixed-position element (the assistant button / chat) be dragged anywhere on screen.
 * The position is the element's distance from the bottom-right corner of the window, so the same spot is used
 * for the small button and the open chat, it survives window resizes, and it is remembered between visits.
 */

export interface Anchor {
  right: number;
  bottom: number;
}

const MARGIN = 8;
const DRAG_THRESHOLD = 4; // px of movement before a press counts as a drag (so a click is still a click)

/** Keeps an element of `size` fully inside a window of size `view`. */
export function clampAnchor(a: Anchor, size: { w: number; h: number }, view: { w: number; h: number }, margin = MARGIN): Anchor {
  const maxRight = Math.max(margin, view.w - size.w - margin);
  const maxBottom = Math.max(margin, view.h - size.h - margin);
  return {
    right: Math.min(Math.max(a.right, margin), maxRight),
    bottom: Math.min(Math.max(a.bottom, margin), maxBottom),
  };
}

function load(key: string, fallback: Anchor): Anchor {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Anchor>;
    if (typeof parsed.right === 'number' && typeof parsed.bottom === 'number' && Number.isFinite(parsed.right) && Number.isFinite(parsed.bottom)) {
      return { right: parsed.right, bottom: parsed.bottom };
    }
  } catch {
    // ignore: fall back to the default spot
  }
  return fallback;
}

export function useDraggableAnchor(storageKey: string, fallback: Anchor, layoutKey: string) {
  const [anchor, setAnchor] = useState<Anchor>(() => load(storageKey, fallback));
  const [shown, setShown] = useState<Anchor>(anchor);
  const elRef = useRef<HTMLElement | null>(null);
  const drag = useRef<{ x: number; y: number; right: number; bottom: number; moved: boolean } | null>(null);
  const justDragged = useRef(false);
  const [dragging, setDragging] = useState(false);

  const measure = useCallback((): Anchor => {
    const el = elRef.current;
    if (!el) return anchor;
    const r = el.getBoundingClientRect();
    return clampAnchor(anchor, { w: r.width, h: r.height }, { w: window.innerWidth, h: window.innerHeight });
  }, [anchor]);

  // Re-fit whenever the position, the element (button vs chat) or the window size changes
  useLayoutEffect(() => {
    setShown(measure());
  }, [measure, layoutKey]);
  useEffect(() => {
    const onResize = () => setShown(measure());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measure]);

  const save = (a: Anchor) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(a));
    } catch {
      // storage unavailable: the position just is not remembered
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    drag.current = { x: e.clientX, y: e.clientY, right: shown.right, bottom: shown.bottom, moved: false };
    justDragged.current = false;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // some browsers refuse capture for synthetic events; dragging still works while the pointer stays over the handle
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!d.moved) setDragging(true);
    d.moved = true;
    const el = elRef.current;
    const r = el?.getBoundingClientRect();
    const next = clampAnchor({ right: d.right - dx, bottom: d.bottom - dy }, { w: r?.width ?? 0, h: r?.height ?? 0 }, { w: window.innerWidth, h: window.innerHeight });
    setAnchor(next);
    setShown(next);
  };

  const endDrag = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
    if (d.moved) {
      justDragged.current = true;
      setDragging(false);
      save(shown);
    }
  };

  // Arrow keys move it too, for people who cannot use a mouse
  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const step = e.shiftKey ? 80 : 24;
    const delta: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const d = delta[e.key];
    if (!d) return;
    e.preventDefault();
    const r = elRef.current?.getBoundingClientRect();
    const next = clampAnchor({ right: shown.right + d[0], bottom: shown.bottom + d[1] }, { w: r?.width ?? 0, h: r?.height ?? 0 }, { w: window.innerWidth, h: window.innerHeight });
    setAnchor(next);
    setShown(next);
    save(next);
  };

  const reset = () => {
    setAnchor(fallback);
    save(fallback);
  };

  /** For a button that is also a drag handle: true if the press that just ended was a drag, not a click. */
  const consumeClick = (): boolean => {
    const was = justDragged.current;
    justDragged.current = false;
    return was;
  };

  return {
    /** Attach to the element that is moved */
    ref: (el: HTMLElement | null) => {
      elRef.current = el;
    },
    style: { right: shown.right, bottom: shown.bottom } as React.CSSProperties,
    dragging,
    /** Spread onto the part the user grabs (header bar or the button) */
    handleProps: { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag, onKeyDown },
    consumeClick,
    reset,
  };
}
