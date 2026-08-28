import React from "react";

import { Info } from "@mui/icons-material";

import { Button } from "@lib/components/Button";
import { Popover } from "@lib/components/Popover";
import { Paragraph } from "@lib/components/Typography/compositions";
import { useIsDocumentActive } from "@lib/hooks/useIsDocumentActive";

/**
 * How a lost GPU context should be recovered once the boundary decides to restore it.
 *
 * - `"redraw"`: keep the existing canvas/DOM. On manual restore the boundary calls
 *   {@link GpuResourceAdapter.restoreContext} to bring the context back, then repaints via
 *   {@link GpuResourceAdapter.requestRender} once `webglcontextrestored` confirms it. Use this when
 *   the renderer can rebuild its GPU resources on the same context. If `restoreContext` is missing
 *   or reports that it could not start, the boundary falls back to `"remount"`.
 * - `"remount"`: throw away the current subtree and mount a fresh one, which creates a brand-new
 *   canvas and WebGL context. Use this for renderers that cannot reliably rebuild their GPU
 *   resources in place.
 */
export type GpuRecoveryStrategy = "redraw" | "remount";

/**
 * Bridge between {@link GpuResourceBoundary} and a concrete WebGL/WebGPU renderer.
 *
 * The boundary itself knows nothing about any specific rendering library. Each renderer provides an
 * adapter that translates renderer-specific events ("the context was lost/restored") into the
 * callbacks the boundary understands, and optionally exposes a way to trigger a redraw.
 *
 * Adapters are typically created with `React.useMemo` in the component that owns the renderer and
 * passed to the boundary via {@link GpuResourceBoundaryProps.adapter}. A new adapter identity causes
 * the boundary to tear down the previous connection and re-`connect`, so keep the identity stable
 * for as long as the underlying renderer instance is stable.
 */
export type GpuResourceAdapter = {
    /**
     * Subscribe to GPU context lifecycle events for the underlying renderer.
     *
     * Called by the boundary in an effect whenever the adapter identity changes. Implementations
     * should attach their listeners (e.g. `canvas.addEventListener("webglcontextlost", ...)`) and
     * return a cleanup function that detaches them again. The cleanup runs before the next
     * `connect` and on unmount.
     *
     * Note that the underlying canvas may not exist yet when `connect` is first called (the
     * renderer can create it in a later effect / async), so adapters may need to poll or wait for
     * it to become available. `connect` also runs *after* the renderer has mounted, so a context
     * can be lost before listeners are attached - an implementation should probe for an
     * already-lost context on connect (and buffer any notification received before it) rather than
     * relying solely on the event.
     *
     * @param callbacks.onContextLost - Invoke when the GPU context is lost. Implementations that
     *   listen for the DOM `webglcontextlost` event must also call `event.preventDefault()` on it,
     *   otherwise the browser will not attempt to restore the context.
     * @param callbacks.onContextRestored - Invoke when the browser has restored the *existing*
     *   context (the DOM `webglcontextrestored` event). Optional: some renderers never emit a
     *   restored signal, in which case recovery must go through the `"remount"` strategy.
     * @returns A cleanup function that detaches all listeners registered by this call.
     */
    connect(callbacks: { onContextLost(): void; onContextRestored?(): void }): () => void;

    /**
     * Attempt to bring a *lost* context back in place (e.g. `WEBGL_lose_context.restoreContext()`).
     *
     * Return `true` if a restoration was started - a `webglcontextrestored` event should follow,
     * which the boundary answers with {@link requestRender}. Return `false` if it could not be
     * attempted (no restore capability, wrong moment, ...); the boundary then falls back to a
     * remount. Omit the method entirely for renderers that can never self-restore.
     *
     * Only used by the `"redraw"` {@link GpuRecoveryStrategy}, for the manual Restore action.
     */
    restoreContext?(): boolean;

    /**
     * Re-issue the renderer's draw calls on the *current, valid* context. Does not restore a lost
     * one - see {@link restoreContext}.
     *
     * Only used by the `"redraw"` {@link GpuRecoveryStrategy} (invoked after restoration). Renderers
     * that always recover via `"remount"` can omit this.
     */
    requestRender?(): void;
};

export type GpuResourceBoundaryProps = {
    /**
     * Adapter for the renderer wrapped by this boundary. While `undefined` (e.g. before the
     * renderer instance exists) the boundary is inert and simply renders its children.
     */
    adapter?: GpuResourceAdapter;
    /**
     * Strategy used when recovering a lost context. Defaults to `"remount"`.
     * @see GpuRecoveryStrategy
     */
    recoveryStrategy?: GpuRecoveryStrategy;
    children?: React.ReactNode;
};

/**
 * Wraps a GPU-backed visualization (WebGL/WebGPU) and handles browser-initiated context loss.
 *
 * Browsers cap the number of live GPU contexts a page may hold. When that budget is exceeded -
 * typically because many graphics-intensive views or tabs are open - the browser drops the context
 * of some canvas, leaving it frozen or blank. This component detects that situation (via the
 * supplied {@link GpuResourceAdapter}), shows an overlay explaining what happened, and offers the
 * user a "Restore" action.
 *
 * Recovery happens in one of two ways, chosen via {@link GpuResourceBoundaryProps.recoveryStrategy}:
 *
 * - `"redraw"` - calls {@link GpuResourceAdapter.restoreContext} to bring the context back, then
 *   {@link GpuResourceAdapter.requestRender} once `webglcontextrestored` confirms it. Falls back to
 *   `"remount"` if `restoreContext` is missing or could not start a restore.
 * - `"remount"` (default) - bumps an internal `key` so the children unmount and remount with a
 *   fresh canvas and context. Because a remount creates a *new* context, no `webglcontextrestored`
 *   event fires for it, so the boundary clears its own "lost" state in this path.
 *
 * In addition to the manual "Restore" button, recovery is attempted automatically when the browser
 * document/tab becomes active again after the context was lost while it was hidden or unfocused
 * ({@link useIsDocumentActive}) - the common case where the browser reclaimed the context while the
 * user was looking at something else.
 *
 * The wrapped renderer must still be able to survive a context loss without throwing; this
 * component only manages the *recovery UX and lifecycle*, not the renderer's internal GPU state.
 *
 * @example
 * ```tsx
 * // `createRendererAdapter` wraps a concrete renderer instance in a GpuResourceAdapter.
 * const adapter = React.useMemo(
 *     () => (renderer ? createRendererAdapter(renderer) : undefined),
 *     [renderer],
 * );
 *
 * return (
 *     <GpuResourceBoundary adapter={adapter} recoveryStrategy="remount">
 *         <Renderer ... />
 *     </GpuResourceBoundary>
 * );
 * ```
 */
export function GpuResourceBoundary(props: GpuResourceBoundaryProps): JSX.Element {
    const isDocumentActive = useIsDocumentActive();

    const [contextLost, setContextLost] = React.useState(false);
    const [generation, bumpGeneration] = React.useReducer((x) => x + 1, 0);

    const previousDocumentActive = React.useRef(isDocumentActive);

    const restore = React.useCallback(
        function restore() {
            if (!contextLost || !props.adapter) {
                return;
            }

            // For "redraw", try an in-place restore; the overlay then stays up until the resulting
            // "webglcontextrestored" reaches onContextRestored, which repaints.
            const restorationStarted =
                props.recoveryStrategy === "redraw" && (props.adapter.restoreContext?.() ?? false);

            if (!restorationStarted) {
                // "remount" strategy, or "redraw" where restoration could not be started: replace
                // the canvas (and its context) by remounting the children. A brand-new context
                // never fires "webglcontextrestored", so clear the lost state here.
                setContextLost(false);
                bumpGeneration();
            }
        },
        [contextLost, props.adapter, props.recoveryStrategy],
    );

    React.useEffect(
        // Depends on recoveryStrategy so onContextRestored below always sees the current one.
        function onAdapterConnectEffect() {
            if (!props.adapter) {
                return;
            }

            return props.adapter.connect({
                onContextLost() {
                    console.debug("GPU context lost");
                    setContextLost(true);
                },

                onContextRestored() {
                    console.debug("GPU context restored");
                    setContextLost(false);
                    if (props.recoveryStrategy === "redraw") {
                        // Context is back in place - nudge the renderer to repaint on it.
                        props.adapter?.requestRender?.();
                    } else {
                        // An in-place restore is not trusted for the "remount" strategy - renderers
                        // routed here (e.g. deck.gl) do not reliably rebuild GPU resources on a
                        // restored context, so swap in a fresh renderer instead.
                        bumpGeneration();
                    }
                },
            });
        },
        [props.adapter, props.recoveryStrategy],
    );

    React.useEffect(
        function onActivationChangeEffect() {
            const documentBecameActive = !previousDocumentActive.current && isDocumentActive;
            previousDocumentActive.current = isDocumentActive;

            if (contextLost && documentBecameActive) {
                restore();
            }
        },
        [contextLost, isDocumentActive, restore],
    );

    return (
        <div className="relative h-full w-full">
            <React.Fragment key={generation}>{props.children}</React.Fragment>
            {contextLost && (
                <>
                    <div className="z-elevated bg-surface/80 absolute inset-0" />
                    <div className="bg-surface z-overlay border-neutral-subtle text-body-sm p-xs gap-xs absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded border text-center">
                        <Paragraph size="sm">The browser has stopped this visualization.</Paragraph>
                        <div className="gap-3xs flex">
                            <Button tone="accent" size="small" onClick={restore}>
                                Restore
                            </Button>
                            <Popover.Root>
                                <Popover.Trigger iconOnly tone="neutral" size="small" aria-label="Why did this happen?">
                                    <Info fontSize="small" />
                                </Popover.Trigger>
                                <Popover.Popup>
                                    <Popover.Title>Why did this happen?</Popover.Title>
                                    <Popover.Content>
                                        <p>
                                            The browser has stopped this visualization to free graphics resources. This
                                            can happen when many graphics-intensive views or browser tabs are open.
                                        </p>
                                        <p>
                                            Browsers limit the graphics resources available to web applications. When
                                            those resources are needed elsewhere, a visualization may be stopped.
                                            Restoring it may cause another graphics-intensive visualization to become
                                            unavailable.
                                        </p>
                                    </Popover.Content>
                                </Popover.Popup>
                            </Popover.Root>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
