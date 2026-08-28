import React from "react";

import { Info } from "@mui/icons-material";

import { Button } from "@lib/components/Button";
import { Popover } from "@lib/components/Popover";
import { Paragraph } from "@lib/components/Typography/compositions";
import { useIsDocumentActive } from "@lib/hooks/useIsDocumentActive";

/**
 * How a lost GPU context should be recovered once the boundary decides to restore it.
 *
 * - `"redraw"`: keep the existing canvas/DOM and ask the underlying renderer to re-issue its draw
 *   calls (via {@link GpuResourceAdapter.requestRender}). Use this when the renderer is able to
 *   rebuild its GPU resources on the same context after a `webglcontextrestored` event.
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
     * Ask the underlying renderer to re-issue its draw calls on the current context.
     *
     * Only used by the `"redraw"` {@link GpuRecoveryStrategy}. Renderers that always recover via
     * `"remount"` can omit this.
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
 * - `"redraw"` - calls {@link GpuResourceAdapter.requestRender} so the renderer repaints on the
 *   (now restored) context.
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

            if (props.recoveryStrategy === "redraw") {
                props.adapter.requestRender?.();
            } else {
                // Remounting replaces the canvas with a brand-new WebGL context, which never
                // fires "webglcontextrestored" (that event only applies to a restored, existing
                // context) - so we must clear the lost state ourselves.
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
                    if (props.recoveryStrategy !== "redraw") {
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
