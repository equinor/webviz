import type { GpuResourceAdapter } from "../gpuResourceBoundary";

export type ManualContextLossAdapter = GpuResourceAdapter & {
    /** Call from the renderer's own "context lost" callback to notify the boundary. */
    notifyContextLost(): void;
};

/**
 * {@link GpuResourceAdapter} for renderers that only surface a single "context lost" callback and
 * neither a DOM canvas to listen on nor a "restored" counterpart.
 *
 * Because there is no restored signal, recovery must go through the boundary's `"remount"`
 * {@link GpuRecoveryStrategy}, which mounts a fresh renderer and clears the lost state itself.
 *
 * Usage: create the adapter once (e.g. with `React.useMemo`), pass it to the boundary, and forward
 * the renderer's callback into {@link ManualContextLossAdapter.notifyContextLost}:
 *
 * ```tsx
 * const adapter = React.useMemo(() => createManualContextLossAdapter(), []);
 * const onContextLost = React.useCallback(() => adapter.notifyContextLost(), [adapter]);
 * // ...
 * <GpuResourceBoundary adapter={adapter} recoveryStrategy="remount">
 *     <Renderer onContextLost={onContextLost} />
 * </GpuResourceBoundary>
 * ```
 */
export function createManualContextLossAdapter(): ManualContextLossAdapter {
    let onContextLostCallback: (() => void) | null = null;
    // The renderer can lose its context before the boundary's passive effect runs `connect` (e.g.
    // Plotly creates its WebGL context during BasePlot's mount). Buffer such a notification and
    // flush it on connect, otherwise the only signal Plotly gives us is lost and the plot stays
    // blank with no overlay.
    let hasPendingNotification = false;

    return {
        connect({ onContextLost }) {
            onContextLostCallback = onContextLost;
            if (hasPendingNotification) {
                hasPendingNotification = false;
                onContextLost();
            }
            return function disconnect() {
                onContextLostCallback = null;
            };
        },

        notifyContextLost() {
            if (onContextLostCallback) {
                onContextLostCallback();
            } else {
                hasPendingNotification = true;
            }
        },
    };
}
