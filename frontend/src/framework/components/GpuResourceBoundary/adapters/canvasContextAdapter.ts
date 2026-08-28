import type { GpuResourceAdapter } from "../gpuResourceBoundary";

export type CanvasContextAdapterOptions = {
    /**
     * Returns the `<canvas>` whose GPU context should be watched, or `null`/`undefined` if it does
     * not exist yet. Called every time the adapter (re)connects, and - when {@link waitForCanvas}
     * is set - repeatedly until it returns a canvas.
     */
    getCanvas(): HTMLCanvasElement | null | undefined;

    /**
     * Brings a *lost* context back in place (e.g. `WEBGL_lose_context.restoreContext()`), which
     * should fire `webglcontextrestored`. Forwarded to {@link GpuResourceAdapter.restoreContext},
     * i.e. used by the boundary's `"redraw"` strategy for the manual Restore action. Omit it if the
     * renderer cannot self-restore - the boundary then falls back to a remount.
     */
    restoreContext?(): void;

    /**
     * Repaints the renderer on the current, valid context. The boundary calls this for its
     * `"redraw"` recovery strategy only (after restoration); this adapter never calls it itself,
     * since it does not know which strategy is in effect. Renderers that always recover via
     * `"remount"` can omit it.
     */
    requestRender?(): void;

    /**
     * Keep polling {@link getCanvas} with `requestAnimationFrame` until it returns a canvas.
     * Needed for renderers that create their canvas asynchronously, after this adapter first
     * connects. Defaults to `false` - a missing canvas is treated as "nothing to watch" and the
     * adapter stays inert until it reconnects.
     */
    waitForCanvas?: boolean;

    /**
     * Reports whether the renderer's GPU context is *already* lost - **without creating a context**
     * (peek an existing one, e.g. `gl.isContextLost()`; never call `getContext()` on a canvas that
     * has none).
     *
     * The renderer creates its context during child mount, but this adapter only attaches its
     * listeners later (the boundary connects in a passive effect, and {@link waitForCanvas} may add
     * another animation frame). A `webglcontextlost` that fires in that gap is neither replayed nor
     * bubbled, so without this probe the overlay would never appear. Checked once, right after the
     * listeners attach.
     */
    isContextLost?(): boolean;
};

/**
 * Generic {@link GpuResourceAdapter} for any renderer that draws into a single `<canvas>` and lets
 * that canvas emit the standard DOM `webglcontextlost` / `webglcontextrestored` events.
 *
 * This is the shared building block that renderer-specific adapters wrap. Renderers that do not
 * expose a canvas or the standard events - only a single "context lost" callback - need
 * {@link createManualContextLossAdapter} instead.
 *
 * The `webglcontextlost` event has `preventDefault()` called on it, which is required for the
 * browser to attempt restoration of the context.
 */
export function createCanvasContextAdapter(options: CanvasContextAdapterOptions): GpuResourceAdapter {
    return {
        connect({ onContextLost, onContextRestored }) {
            let cancelled = false;
            let rafHandle: number | null = null;
            let detachListeners: (() => void) | null = null;

            function handleContextLost(event: Event) {
                // Required for the browser to attempt restoration of the context.
                event.preventDefault();
                onContextLost();
            }

            function handleContextRestored() {
                // Forward the signal only. Whether to repaint is the boundary's call - it depends
                // on the recovery strategy, which this adapter does not know.
                onContextRestored?.();
            }

            function attachWhenReady() {
                if (cancelled) {
                    return;
                }

                const canvas = options.getCanvas();
                if (!canvas) {
                    if (options.waitForCanvas) {
                        rafHandle = requestAnimationFrame(attachWhenReady);
                    }
                    return;
                }

                canvas.addEventListener("webglcontextlost", handleContextLost);
                canvas.addEventListener("webglcontextrestored", handleContextRestored);

                detachListeners = function detach() {
                    canvas.removeEventListener("webglcontextlost", handleContextLost);
                    canvas.removeEventListener("webglcontextrestored", handleContextRestored);
                };

                // Catch a context loss that fired before these listeners were attached - that
                // event does not replay, so probe the current state instead. No preventDefault is
                // possible here; recovery falls to the boundary's strategy (remount, or a redraw
                // that force-restores).
                if (options.isContextLost?.()) {
                    onContextLost();
                }
            }

            attachWhenReady();

            return function disconnect() {
                cancelled = true;
                if (rafHandle !== null) {
                    cancelAnimationFrame(rafHandle);
                }
                detachListeners?.();
            };
        },

        restoreContext: options.restoreContext,

        requestRender() {
            options.requestRender?.();
        },
    };
}
