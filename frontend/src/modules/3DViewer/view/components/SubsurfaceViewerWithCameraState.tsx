import React from "react";

import { SubsurfaceViewerProps, ViewStateType } from "@webviz/subsurface-viewer";
import SubsurfaceViewer from "@webviz/subsurface-viewer/dist/SubsurfaceViewer";

import { isEqual } from "lodash";

export type SubsurfaceViewerWithCameraStateProps = SubsurfaceViewerProps & {
    userCameraInteractionActive?: boolean;
    onCameraPositionApplied?: () => void;
};

export function SubsurfaceViewerWithCameraState(props: SubsurfaceViewerWithCameraStateProps): React.ReactNode {
    const [prevBounds, setPrevBounds] = React.useState<[number, number, number, number] | undefined>(undefined);
    const [prevCameraPosition, setPrevCameraPosition] = React.useState<ViewStateType | undefined>(undefined);
    const [cameraPosition, setCameraPosition] = React.useState<ViewStateType | undefined>(undefined);

    if (!isEqual(props.bounds, prevBounds)) {
        setPrevBounds(props.bounds);
        setCameraPosition(undefined);
    }

    if (!isEqual(props.cameraPosition, prevCameraPosition)) {
        setPrevCameraPosition(props.cameraPosition);
        if (props.cameraPosition) {
            setCameraPosition(props.cameraPosition);
            props.onCameraPositionApplied?.();
        }
    }

    const handleCameraChange = React.useCallback(
        function handleCameraChange(viewport: ViewStateType): void {
            if (props.userCameraInteractionActive || props.userCameraInteractionActive === undefined) {
                setCameraPosition(viewport);
            }
        },
        [props.userCameraInteractionActive]
    );

    return <SubsurfaceViewer {...props} cameraPosition={cameraPosition} getCameraPosition={handleCameraChange} />;
}
