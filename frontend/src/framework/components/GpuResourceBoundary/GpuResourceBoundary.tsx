import React from "react";

import { ActiveDashboardContext } from "@framework/internal/components/ActiveDashboardBoundary";
import { useIsDocumentActive } from "@lib/hooks/useIsDocumentActive";
import { Button } from "@lib/components/Button";
import { Heading, Paragraph } from "@lib/components/Typography/compositions";
import { Popover } from "@lib/components/Popover";
import { Info } from "@mui/icons-material";

export type GpuRecoveryStrategy = "redraw" | "remount";

export type GpuResourceAdapter = {
    connect(callbacks: { onContextLost(): void; onContextRestored?(): void }): () => void;

    requestRender?(): void;
};

export type GpuResourceBoundaryProps = {
    adapter?: GpuResourceAdapter;
    recoveryStrategy?: GpuRecoveryStrategy;
    children?: React.ReactNode;
};

export function GpuResourceBoundary(props: GpuResourceBoundaryProps): JSX.Element {
    const isDocumentActive = useIsDocumentActive();

    const activeDashboard = React.useContext(ActiveDashboardContext);
    const isDashboardActive = activeDashboard !== null;

    const [contextLost, setContextLost] = React.useState(false);
    const [generation, bumpGeneration] = React.useReducer((x) => x + 1, 0);

    const previousDocumentActive = React.useRef(isDocumentActive);
    const previousDashboardActive = React.useRef(isDashboardActive);

    const restore = React.useCallback(() => {
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
    }, [contextLost, props.adapter, props.recoveryStrategy]);

    React.useEffect(
        function onAdapterChangeEffect() {
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
                },
            });
        },
        [props.adapter],
    );

    React.useEffect(
        function onActivationChangeEffect() {
            const dashboardBecameActive = !previousDashboardActive.current && isDashboardActive;

            const documentBecameActive = !previousDocumentActive.current && isDocumentActive;

            previousDashboardActive.current = isDashboardActive;
            previousDocumentActive.current = isDocumentActive;

            if (contextLost && (dashboardBecameActive || documentBecameActive)) {
                restore();
            }
        },
        [contextLost, isDashboardActive, isDocumentActive, restore],
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
                                <Popover.Trigger iconOnly tone="neutral" size="small">
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
