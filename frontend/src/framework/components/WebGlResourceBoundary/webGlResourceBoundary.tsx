import React from "react";

import { useActiveDashboard } from "@framework/internal/components/ActiveDashboardBoundary";
import { useIsDocumentActive } from "@lib/hooks/useIsDocumentActive";

export type WebGlRecoveryStrategy = "redraw" | "remount";

export type WebGlResourceAdapter = {
    connect(callbacks: { onContextLost(): void; onContextRestored?(): void }): () => void;

    requestRender?(): void;
};

export type WebGlResourceBoundaryProps = {
    adapter: WebGlResourceAdapter;
    recoveryStrategy?: WebGlRecoveryStrategy;
    children?: React.ReactNode;
};

export function WebGlResourceBoundary(props: WebGlResourceBoundaryProps): JSX.Element {
    const isDocumentActive = useIsDocumentActive();
    const activeDashboard = useActiveDashboard();
    const isDashboardActive = activeDashboard !== null;

    const [contextLost, setContextLost] = React.useState(false);
    const [generation, bumpGeneration] = React.useReducer((x) => x + 1, 0);

    React.useEffect(
        function onAdapterChangeEffect() {
            return props.adapter.connect({
                onContextLost() {
                    setContextLost(true);
                },

                onContextRestored() {
                    setContextLost(false);
                },
            });
        },
        [props.adapter],
    );

    React.useEffect(
        function onContextLostEffect() {
            if (!contextLost || !isDashboardActive || !isDocumentActive) {
                return;
            }

            if (props.recoveryStrategy === "redraw") {
                props.adapter.requestRender?.();
            } else {
                bumpGeneration();
            }
        },
        [contextLost, isDashboardActive, isDocumentActive, props.recoveryStrategy, props.adapter],
    );

    return <React.Fragment key={generation}>{props.children}</React.Fragment>;
}
