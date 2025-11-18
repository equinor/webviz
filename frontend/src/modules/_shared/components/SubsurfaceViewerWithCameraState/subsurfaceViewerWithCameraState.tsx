import React from "react";

import type { SubsurfaceViewerProps, ViewStateType } from "@webviz/subsurface-viewer";
import SubsurfaceViewer from "@webviz/subsurface-viewer/dist/SubsurfaceViewer";
import { isEqual } from "lodash";

export type SubsurfaceViewerWithCameraStateProps = SubsurfaceViewerProps & {
    initialCameraPosition?: ViewStateType;
    userCameraInteractionActive?: boolean;
    onCameraPositionApplied?: () => void;
};

export function SubsurfaceViewerWithCameraState(props: SubsurfaceViewerWithCameraStateProps): React.ReactNode {
    const { getCameraPosition, onCameraPositionApplied } = props;

    const [prevTriggerHome, setPrevTriggerHome] = React.useState<number | undefined>(0);
    const [prevBounds, setPrevBounds] = React.useState<[number, number, number, number] | undefined>(undefined);
    const [prevCameraPosition, setPrevCameraPosition] = React.useState<ViewStateType | undefined>(
        props.initialCameraPosition,
    );
    const [cameraPosition, setCameraPosition] = React.useState<ViewStateType | undefined>(props.initialCameraPosition);

    if (!isEqual(props.bounds, prevBounds)) {
        setPrevBounds(props.bounds);
        // setCameraPosition(undefined);
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
