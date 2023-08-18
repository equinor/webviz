import React from "react";

import { PolygonData_api, WellBoreTrajectory_api } from "@api";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { Button } from "@lib/components/Button";
import SubsurfaceViewer from "@webviz/subsurface-viewer";
import { ViewStateType } from "@webviz/subsurface-viewer/dist/components/Map";

import {
    useGetFieldWellsTrajectories,
    usePolygonsDataQueryByAddress,
    usePropertySurfaceDataByQueryAddress,
    useSurfaceDataQueryByAddress,
} from "././queryHooks";
import {
    SurfaceMeta,
    createAxesLayer,
    createNorthArrowLayer,
    createSurfaceMeshLayer,
    createSurfacePolygonsLayer,
    createWellBoreHeaderLayer,
    createWellboreTrajectoryLayer,
} from "./_utils";
import { state } from "./state";

//-----------------------------------------------------------------------------------------------------------
export function view({ moduleContext, workbenchServices }: ModuleFCProps<state>) {
    const myInstanceIdStr = moduleContext.getInstanceIdString();
    console.debug(`${myInstanceIdStr} -- render TopographicMap view`);

    const meshSurfAddr = moduleContext.useStoreValue("meshSurfaceAddress");
    const propertySurfAddr = moduleContext.useStoreValue("propertySurfaceAddress");
    const polygonsAddr = moduleContext.useStoreValue("polygonsAddress");
    const selectedWellUuids = moduleContext.useStoreValue("selectedWellUuids");
    const surfaceSettings = moduleContext.useStoreValue("surfaceSettings");
    const [resetBounds, toggleResetBounds] = React.useState<boolean>(false);
    const [layers, SetLayers] = React.useState<Record<string, unknown>[]>([]);
    const [viewportBounds, setviewPortBounds] = React.useState<[number, number, number, number] | undefined>(undefined);
    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);

    const meshSurfDataQuery = useSurfaceDataQueryByAddress(meshSurfAddr, true);

    const hasMeshSurfData = meshSurfDataQuery?.data ? true : false;
    const propertySurfDataQuery = usePropertySurfaceDataByQueryAddress(meshSurfAddr, propertySurfAddr, hasMeshSurfData);

    const wellTrajectoriesQuery = useGetFieldWellsTrajectories(meshSurfAddr?.caseUuid);
    const polygonsQuery = usePolygonsDataQueryByAddress(polygonsAddr);

    let newLayers: Record<string, unknown>[] = [createNorthArrowLayer()];
    let surfaceLayer: Record<string, unknown> | undefined = undefined;

    // Mesh data query should only trigger update if the property surface address is not set or if the property surface data is loaded
    if (meshSurfDataQuery.data && !propertySurfAddr) {
        const newMeshData = JSON.parse(meshSurfDataQuery.data.mesh_data);

        const newSurfaceMetaData: SurfaceMeta = { ...meshSurfDataQuery.data };
        const surfaceLayer: Record<string, unknown> = createSurfaceMeshLayer(
            newSurfaceMetaData,
            newMeshData,
            surfaceSettings
        );
        newLayers.push(surfaceLayer);
    } else if (meshSurfDataQuery.data && propertySurfDataQuery.data) {
        if (meshSurfDataQuery.data && !propertySurfDataQuery.isLoading) {
            const newMeshData = JSON.parse(meshSurfDataQuery.data.mesh_data);
            let newPropertyData: string | undefined = undefined;
            if (propertySurfDataQuery.data) {
                newPropertyData = JSON.parse(propertySurfDataQuery.data.mesh_data);
            }

            const newSurfaceMetaData: SurfaceMeta = { ...meshSurfDataQuery.data };
            const surfaceLayer: Record<string, unknown> = createSurfaceMeshLayer(
                newSurfaceMetaData,
                newMeshData,
                surfaceSettings,
                newPropertyData
            );
            newLayers.push(surfaceLayer);
        }
    }

    // Calculate viewport bounds and axes layer from the surface bounds.
    // TODO: Should be done automatically by the component while considering all layers, with an option to lock the bounds
    if ((meshSurfDataQuery.data && !propertySurfAddr) || (meshSurfDataQuery.data && propertySurfDataQuery.data)) {
        const newSurfaceMetaData: SurfaceMeta = { ...meshSurfDataQuery.data };
        if (!viewportBounds || resetBounds) {
            setviewPortBounds([
                newSurfaceMetaData.x_min,
                newSurfaceMetaData.y_min,
                newSurfaceMetaData.x_max,
                newSurfaceMetaData.y_max,
            ]);
            toggleResetBounds(false);
        }
        const axesLayer: Record<string, unknown> = createAxesLayer([
            newSurfaceMetaData.x_min,
            newSurfaceMetaData.y_min,
            0,
            newSurfaceMetaData.x_max,
            newSurfaceMetaData.y_max,
            3500,
        ]);
        newLayers.push(axesLayer);
    }

    if (polygonsQuery.data) {
        const polygonsData: PolygonData_api[] = polygonsQuery.data;
        const polygonsLayer: Record<string, unknown> = createSurfacePolygonsLayer(polygonsData);
        newLayers.push(polygonsLayer);
    }
    if (wellTrajectoriesQuery.data) {
        const wellTrajectories: WellBoreTrajectory_api[] = wellTrajectoriesQuery.data.filter((well) =>
            selectedWellUuids.includes(well.wellbore_uuid)
        );
        const wellTrajectoryLayer: Record<string, unknown> = createWellboreTrajectoryLayer(wellTrajectories);
        const wellBoreHeaderLayer: Record<string, unknown> = createWellBoreHeaderLayer(wellTrajectories);
        newLayers.push(wellTrajectoryLayer);
        newLayers.push(wellBoreHeaderLayer);
    }

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
                    layers={newLayers}
                    toolbar={{ visible: true }}
                    views={{
                        layout: [1, 1],
                        showLabel: false,
                        viewports: [
                            {
                                id: "view_1",
                                isSync: true,
                                show3D: true,
                                layerIds: layers.map((layer) => layer.id) as string[],
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
