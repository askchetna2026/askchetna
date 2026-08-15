'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import styles from './ChartZoom.module.css';

/**
 * Pinch, wheel and drag zoom around a chart.
 *
 * A kundali is a grid of twelve houses, each carrying two to five abbreviated
 * planet names with degrees. At the size it renders on a phone that is roughly
 * six-point type — legible only if you already know what it says. Zooming is
 * not a nicety here; it is how the chart gets read.
 *
 * Deliberately not a fullscreen modal. The chart sits beside its own
 * interpretation, and sending the reader to a separate surface to look closely
 * means losing the text that explains what they are looking at. Zoom happens in
 * place.
 *
 * Transform only — never width/height or a re-render of the SVG. The chart is
 * several hundred nodes; animating layout would drop frames on exactly the
 * mid-range Android hardware most likely to need the zoom.
 *
 * The controls exist because pinch is invisible. A reader who does not think to
 * try it never discovers the feature, and on desktop there is no pinch at all —
 * a trackpad sends wheel events, and a mouse has no gesture.
 */

const MIN = 1;
const MAX = 4;

type Point = { x: number; y: number };

export default function ChartZoom({ children }: { children: React.ReactNode }) {
    const frameRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });

    // Live pointers, keyed by pointerId — two of them means a pinch.
    const pointers = useRef(new Map<number, Point>());
    const pinchStart = useRef<{ distance: number; scale: number } | null>(null);
    const panStart = useRef<{ pointer: Point; offset: Point } | null>(null);

    const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value));

    /**
     * Keep the chart from being dragged off its own frame. The further in it is
     * zoomed, the more of it is off-frame and the more panning is allowed —
     * at 1x there is nothing to pan to, so the offset is pinned to zero.
     */
    const clampOffset = useCallback((next: Point, atScale: number): Point => {
        const el = frameRef.current;
        if (!el || atScale <= 1) return { x: 0, y: 0 };
        const limitX = (el.clientWidth * (atScale - 1)) / 2;
        const limitY = (el.clientHeight * (atScale - 1)) / 2;
        return { x: clamp(next.x, -limitX, limitX), y: clamp(next.y, -limitY, limitY) };
    }, []);

    const zoomTo = useCallback((next: number) => {
        const target = clamp(next, MIN, MAX);
        setScale(target);
        setOffset((current) => clampOffset(current, target));
    }, [clampOffset]);

    const reset = useCallback(() => {
        setScale(1);
        setOffset({ x: 0, y: 0 });
    }, []);

    /**
     * Wheel is bound here rather than with onWheel, because React attaches
     * passive listeners and a passive listener cannot preventDefault — without
     * which the page scrolls behind the chart while it is being zoomed.
     */
    useEffect(() => {
        const el = frameRef.current;
        if (!el) return;

        const onWheel = (event: WheelEvent) => {
            // Trackpad pinch arrives as ctrlKey+wheel; a plain wheel over the
            // chart should still scroll the page, or the chart becomes a trap
            // for anyone scrolling past it.
            if (!event.ctrlKey && scale === 1) return;
            event.preventDefault();
            zoomTo(scale - event.deltaY * 0.01);
        };

        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [scale, zoomTo]);

    const distanceBetween = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

    const onPointerDown = (event: React.PointerEvent) => {
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        // Captured so a drag that leaves the frame keeps tracking rather than
        // stopping dead at the edge.
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

        const live = [...pointers.current.values()];
        if (live.length === 2) {
            pinchStart.current = { distance: distanceBetween(live[0], live[1]), scale };
            panStart.current = null;
        } else if (live.length === 1 && scale > 1) {
            panStart.current = { pointer: live[0], offset };
        }
    };

    const onPointerMove = (event: React.PointerEvent) => {
        if (!pointers.current.has(event.pointerId)) return;
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

        const live = [...pointers.current.values()];

        if (live.length === 2 && pinchStart.current) {
            const ratio = distanceBetween(live[0], live[1]) / pinchStart.current.distance;
            zoomTo(pinchStart.current.scale * ratio);
            return;
        }

        if (live.length === 1 && panStart.current) {
            const moved = {
                x: panStart.current.offset.x + (live[0].x - panStart.current.pointer.x),
                y: panStart.current.offset.y + (live[0].y - panStart.current.pointer.y),
            };
            setOffset(clampOffset(moved, scale));
        }
    };

    const endPointer = (event: React.PointerEvent) => {
        pointers.current.delete(event.pointerId);
        if (pointers.current.size < 2) pinchStart.current = null;
        if (pointers.current.size === 0) panStart.current = null;
    };

    const zoomed = scale > 1;

    return (
        <div className={styles.wrap}>
            <div
                ref={frameRef}
                className={styles.frame}
                data-zoomed={zoomed || undefined}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endPointer}
                onPointerCancel={endPointer}
                onDoubleClick={() => (zoomed ? reset() : zoomTo(2))}
            >
                <div
                    className={styles.stage}
                    style={{
                        // A single transform string, not separate scale/translate
                        // props, so the whole thing stays on the compositor.
                        transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                    }}
                >
                    {children}
                </div>
            </div>

            <div className={styles.controls}>
                <button
                    type="button"
                    onClick={() => zoomTo(scale - 0.5)}
                    disabled={scale <= MIN}
                    aria-label="Zoom out"
                    className={styles.control}
                >
                    <ZoomOut size={16} aria-hidden="true" />
                </button>

                <button
                    type="button"
                    onClick={reset}
                    disabled={!zoomed}
                    aria-label="Reset zoom"
                    className={styles.control}
                >
                    <Maximize2 size={15} aria-hidden="true" />
                </button>

                <button
                    type="button"
                    onClick={() => zoomTo(scale + 0.5)}
                    disabled={scale >= MAX}
                    aria-label="Zoom in"
                    className={styles.control}
                >
                    <ZoomIn size={16} aria-hidden="true" />
                </button>

                {/* Announced politely so a screen reader hears the level change
                    without it interrupting whatever else is being read. */}
                <span className={styles.level} aria-live="polite">
                    {scale.toFixed(1)}×
                </span>
            </div>
        </div>
    );
}
