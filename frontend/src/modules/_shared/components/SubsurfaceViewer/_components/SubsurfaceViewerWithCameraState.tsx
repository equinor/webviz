import React from "react";

import type { DeckGLRef } from "@deck.gl/react";
import type { BoundingBox2D, SubsurfaceViewerProps, ViewStateType } from "@webviz/subsurface-viewer";
import SubsurfaceViewer from "@webviz/subsurface-viewer/dist/SubsurfaceViewer";
import { isEqual } from "lodash-es";

import { GpuResourceBoundary, type GpuResourceAdapter } from "@framework/components/GpuResourceBoundary";
import * as bbox from "@lib/utils/bbox";

export type SubsurfaceViewerWithCameraStateProps = SubsurfaceViewerProps & {
    initialCameraPosition?: ViewStateType;
    userCameraInteractionActive?: boolean;
    onCameraPositionApplied?: () => void;
};

export function SubsurfaceViewerWithCameraState(props: SubsurfaceViewerWithCameraStateProps): React.ReactNode {
    const { getCameraPosition, onCameraPositionApplied, deckGlRef } = props;

    const [deckGlInstance, setDeckGlInstance] = React.useState<DeckGLRef | null>(null);

    React.useImperativeHandle(props.deckGlRef, () => deckGlInstance!, [deckGlInstance]);

    const adapter = React.useMemo(
        () => (deckGlInstance ? createDeckGlAdapter(deckGlInstance) : undefined),
        [deckGlInstance],
    );

    const [prevTriggerHome, setPrevTriggerHome] = React.useState<number | undefined>(0);
    const [prevBounds, setPrevBounds] = React.useState<BoundingBox2D | undefined>(undefined);
    const [prevCameraPosition, setPrevCameraPosition] = React.useState<ViewStateType | undefined>(
        props.initialCameraPosition,
    );
    const [cameraPosition, setCameraPosition] = React.useState<ViewStateType | undefined>(props.initialCameraPosition);

    // We only want to reset camera position when bounds change significantly (non-overlapping - this happens on a field change for instance)
    // or when triggered explicitly (e.g., home button).
    // We also want to update camera position when props.cameraPosition changes.
    let propsBounds = props.bounds;
    if (typeof propsBounds === "function") {
        propsBounds = propsBounds();
    }
    if (!isEqual(propsBounds, prevBounds)) {
        setPrevBounds(propsBounds);
        if (propsBounds && prevBounds) {
            const prevBbox = bbox.fromNumArray([prevBounds[0], prevBounds[1], 0, prevBounds[2], prevBounds[3], 0]);
            const newBbox = bbox.fromNumArray([propsBounds[0], propsBounds[1], 0, propsBounds[2], propsBounds[3], 0]);
            if (!bbox.intersects(prevBbox, newBbox)) {
                setCameraPosition(undefined);
            }
        }
    }

    if (props.triggerHome !== prevTriggerHome) {
        setPrevTriggerHome(props.triggerHome);
        if (props.triggerHome) {
            setCameraPosition(undefined);
        }
    }

    if (!isEqual(props.cameraPosition, prevCameraPosition)) {
        setPrevCameraPosition(props.cameraPosition);
        if (props.cameraPosition) {
            setCameraPosition(props.cameraPosition);
        }
    }

    const handleCameraChange = React.useCallback(
        function handleCameraChange(viewport: ViewStateType): void {
            if (props.userCameraInteractionActive || props.userCameraInteractionActive === undefined) {
                setCameraPosition(viewport);
            } else {
                setCameraPosition(undefined);
            }
            getCameraPosition?.(viewport);
        },
        [props.userCameraInteractionActive, getCameraPosition],
    );

    React.useEffect(
        function propagateCameraPositionChange(): void {
            if (cameraPosition && !isEqual(cameraPosition, props.cameraPosition)) {
                onCameraPositionApplied?.();
            }
        },
        [cameraPosition, props.cameraPosition, onCameraPositionApplied],
    );

    return (
        <GpuResourceBoundary adapter={adapter} recoveryStrategy="remount">
            <SubsurfaceViewer
                {...props}
                deckGlRef={setDeckGlInstance}
                cameraPosition={cameraPosition}
                getCameraPosition={handleCameraChange}
            />
        </GpuResourceBoundary>
    );
}

export function createDeckGlAdapter(deckGl: DeckGLRef): GpuResourceAdapter {
    return {
        connect({ onContextLost, onContextRestored }) {
            let cancelled = false;
            let rafHandle: number | null = null;
            let detachListeners: (() => void) | null = null;

            const handleContextLost = (event: Event) => {
                // Required if you want the browser to attempt restoration.
                event.preventDefault();

                onContextLost();
            };

            const handleContextRestored = () => {
                onContextRestored?.();
            };

            // deckGl.deck is only populated once DeckGL's own effect has created the
            // underlying Deck instance, which can happen after this effect first runs.
            // Poll until the canvas is available instead of silently giving up.
            const attachWhenReady = () => {
                if (cancelled) {
                    return;
                }

                const canvas = deckGl?.deck?.getCanvas();
                if (!canvas) {
                    rafHandle = requestAnimationFrame(attachWhenReady);
                    return;
                }

                canvas.addEventListener("webglcontextlost", handleContextLost);
                canvas.addEventListener("webglcontextrestored", handleContextRestored);

                detachListeners = () => {
                    canvas.removeEventListener("webglcontextlost", handleContextLost);
                    canvas.removeEventListener("webglcontextrestored", handleContextRestored);
                };
            };

            attachWhenReady();

            return () => {
                cancelled = true;
                if (rafHandle !== null) {
                    cancelAnimationFrame(rafHandle);
                }
                detachListeners?.();
            };
        },

        requestRender() {
            deckGl?.deck?.redraw("context loss");
        },
    };
}
