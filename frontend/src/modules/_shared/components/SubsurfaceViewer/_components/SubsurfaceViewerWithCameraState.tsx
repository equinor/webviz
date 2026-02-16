import React from "react";

import type { BoundingBox2D, SubsurfaceViewerProps, ViewStateType } from "@webviz/subsurface-viewer";
import SubsurfaceViewer from "@webviz/subsurface-viewer/dist/SubsurfaceViewer";
import { isEqual } from "lodash";

import * as bbox from "@lib/utils/bbox";

export type SubsurfaceViewerWithCameraStateProps = SubsurfaceViewerProps & {
    initialCameraPosition?: ViewStateType;
    userCameraInteractionActive?: boolean;
    onCameraPositionApplied?: () => void;
};

export function SubsurfaceViewerWithCameraState(props: SubsurfaceViewerWithCameraStateProps): React.ReactNode {
    const { getCameraPosition, onCameraPositionApplied } = props;

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

    return <SubsurfaceViewer {...props} cameraPosition={cameraPosition} getCameraPosition={handleCameraChange} />;
}
