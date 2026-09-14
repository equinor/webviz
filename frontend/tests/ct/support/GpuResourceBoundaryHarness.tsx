import React from "react";

import {
    GpuResourceBoundary,
    type GpuRecoveryStrategy,
    type GpuResourceAdapter,
} from "@framework/components/GpuResourceBoundary";

type Props = {
    recoveryStrategy: GpuRecoveryStrategy;
    /** What the fake renderer's restoreContext() reports. */
    restoreContextResult?: boolean;
};

let instanceCounter = 0;

function FakeRenderer(): React.JSX.Element {
    // A fresh instance id on every mount → the test can see a remount happen.
    const [id] = React.useState(() => ++instanceCounter);
    return <div data-testid="renderer">instance #{id}</div>;
}

/**
 * Browser-side harness for component-testing {@link GpuResourceBoundary} with a fake renderer - no
 * WebGL, no backend. The buttons drive the adapter callbacks and the counters reveal what the
 * boundary did (child remounts show up as a changed renderer instance id, repaints bump
 * `render-count`).
 */
export function GpuResourceBoundaryHarness(props: Props): React.JSX.Element {
    const cbRef = React.useRef<{ onContextLost?(): void; onContextRestored?(): void }>({});
    const [renderCount, setRenderCount] = React.useState(0);

    const adapter = React.useMemo<GpuResourceAdapter>(
        () => ({
            connect(cb) {
                cbRef.current = cb;
                return () => (cbRef.current = {});
            },
            restoreContext: () => props.restoreContextResult ?? false,
            requestRender: () => setRenderCount((n) => n + 1),
        }),
        [props.restoreContextResult],
    );

    return (
        <div>
            <button data-testid="lose" onClick={() => cbRef.current.onContextLost?.()}>
                lose
            </button>
            <button data-testid="restored" onClick={() => cbRef.current.onContextRestored?.()}>
                restored
            </button>
            <div data-testid="render-count">{renderCount}</div>

            <GpuResourceBoundary adapter={adapter} recoveryStrategy={props.recoveryStrategy}>
                <FakeRenderer />
            </GpuResourceBoundary>
        </div>
    );
}
