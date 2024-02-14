import React from "react";

import { ModuleContext } from "@framework/ModuleContext";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { WorkbenchServices } from "@framework/WorkbenchServices";
import SubsurfaceViewer, { SubsurfaceViewerProps } from "@webviz/subsurface-viewer";
import { ViewStateType } from "@webviz/subsurface-viewer/dist/components/Map";

export type SyncedSubsurfaceViewerProps = {
    moduleContext: ModuleContext<any>;
    workbenchServices: WorkbenchServices;
} & SubsurfaceViewerProps;
interface CameraPosition {
    target: number[];
    zoom: number;
    rotationX: number;
    rotationOrbit: number;
}
export function SyncedSubsurfaceViewer(props: SyncedSubsurfaceViewerProps): JSX.Element {
    const { moduleContext, workbenchServices, bounds, ...rest } = props;
    const [cameraPosition, setCameraPosition] = React.useState<CameraPosition | undefined>(undefined);
    const [newBounds, setNewBounds] = React.useState<[number, number, number, number] | undefined>(bounds);
    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);

    function onCameraChange(viewport: ViewStateType) {
        const newCameraPosition: CameraPosition = {
            target: viewport.target,
            zoom: viewport.zoom as number,
            rotationX: viewport.rotationX,
            rotationOrbit: viewport.rotationOrbit,
        };
        syncHelper.publishValue(
            SyncSettingKey.CAMERA_POSITION_MAP,
            "global.syncValue.cameraPositionMap",
            newCameraPosition
        );
        setCameraPosition(newCameraPosition);
    }
    React.useEffect(() => {
        if (newBounds != bounds) {
            setNewBounds(bounds);
            setCameraPosition(undefined);
        }
    }, [bounds]);

    const computedCameraPosition =
        syncHelper.useValue(SyncSettingKey.CAMERA_POSITION_MAP, "global.syncValue.cameraPositionMap") || cameraPosition;
    return (
        <SubsurfaceViewer
            getCameraPosition={onCameraChange}
            cameraPosition={computedCameraPosition}
            bounds={newBounds}
            {...rest}
        ></SubsurfaceViewer>
    );
}
