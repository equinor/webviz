import React from "react";

import { WellBoreTrajectory_api } from "@api";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { Button } from "@lib/components/Button";
import SubsurfaceViewer from "@webviz/subsurface-viewer";
import { ViewStateType } from "@webviz/subsurface-viewer/dist/components/Map";

import { useGetFieldWellsTrajectories, useSurfaceDataQueryByAddress } from "././queryHooks";
import { SurfaceMeta, createSurfaceMeshLayer, createWellboreTrajectoryLayer } from "./_utils";
import { state } from "./state";

//-----------------------------------------------------------------------------------------------------------
export function view({ moduleContext, workbenchServices }: ModuleFCProps<state>) {
    const myInstanceIdStr = moduleContext.getInstanceIdString();
    console.debug(`${myInstanceIdStr} -- render TopographicMap view`);

    const surfAddr = moduleContext.useStoreValue("surfaceAddress");
    const selectedWellUuids = moduleContext.useStoreValue("selectedWellUuids");
    const surfaceSettings = moduleContext.useStoreValue("surfaceSettings");
    const [resetBounds, toggleResetBounds] = React.useState<boolean>(false);
    const [layers, SetLayers] = React.useState<Record<string, unknown>[]>([]);
    const [viewportBounds, setviewPortBounds] = React.useState<[number, number, number, number] | undefined>(undefined);

    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);

    const surfDataQuery = useSurfaceDataQueryByAddress(surfAddr);
    const wellTrajectoriesQuery = useGetFieldWellsTrajectories(surfAddr?.caseUuid);

    React.useEffect(
        function layersHaveChanged() {
            let newLayers: Record<string, unknown>[] = [];
            if (surfDataQuery.data) {
                const newMeshData = JSON.parse(surfDataQuery.data.mesh_data);
                const newSurfaceMetaData: SurfaceMeta = { ...surfDataQuery.data };
                const surfaceLayer: Record<string, unknown> = createSurfaceMeshLayer(
                    newSurfaceMetaData,
                    newMeshData,
                    surfaceSettings
                );
                newLayers.push(surfaceLayer);
                if (!viewportBounds || resetBounds) {
                    setviewPortBounds([
                        newSurfaceMetaData.x_min,
                        newSurfaceMetaData.y_min,
                        newSurfaceMetaData.x_max,
                        newSurfaceMetaData.y_max,
                    ]);
                    toggleResetBounds(false);
                }
            }

            if (wellTrajectoriesQuery.data) {
                const wellTrajectories: WellBoreTrajectory_api[] = wellTrajectoriesQuery.data.filter((well) =>
                    selectedWellUuids.includes(well.wellbore_uuid)
                );
                const wellTrajectoryLayer: Record<string, unknown> = createWellboreTrajectoryLayer(wellTrajectories);
                console.log(wellTrajectories);
                newLayers.push(wellTrajectoryLayer);
            }

            SetLayers(newLayers);
        },
        [surfDataQuery.data, selectedWellUuids, surfaceSettings, resetBounds]
    );

    function onCameraChange(viewport: ViewStateType) {
        syncHelper.publishValue(SyncSettingKey.CAMERA_POSITION_MAP, "global.syncValue.cameraPositionMap", {
            target: viewport.target,
            zoom: viewport.zoom as number,
            rotationX: viewport.rotationX,
            rotationOrbit: viewport.rotationOrbit,
            minZoom: viewport.minZoom,
            maxZoom: viewport.maxZoom,
        });
    }

    return (
        <div className="relative w-full h-full flex flex-col">
            <div className="absolute top-0 right-0 z-10">
                <Button variant="contained" onClick={() => toggleResetBounds(!resetBounds)}>
                    Reset viewport bounds
                </Button>
            </div>
            <div className="z-1">
                <SubsurfaceViewer
                    id="deckgl"
                    bounds={viewportBounds}
                    layers={layers}
                    toolbar={{ visible: true }}
                    views={{
                        layout: [1, 1],
                        showLabel: false,
                        viewports: [
                            {
                                id: "view_1",
                                isSync: true,
                                show3D: true,
                                layerIds: ["axes-layer", "wells-layer", "mesh-layer"],
                            },
                        ],
                    }}
                    getCameraPosition={onCameraChange}
                    cameraPosition={
                        syncHelper.useValue(SyncSettingKey.CAMERA_POSITION_MAP, "global.syncValue.cameraPositionMap") ||
                        undefined
                    }
                />
            </div>
        </div>
    );
}
