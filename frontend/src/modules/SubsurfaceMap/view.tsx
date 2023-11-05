import React from "react";

import { PolygonData_api, WellBoreTrajectory_api } from "@api";
import { ContinuousLegend } from "@emerson-eps/color-tables";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { Wellbore } from "@framework/Wellbore";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { usePolygonsDataQueryByAddress } from "@modules/_shared/Polygons";
import { useFieldWellsTrajectoriesQuery } from "@modules/_shared/WellBore/queryHooks";
import {
    Axes3DLayer,
    FaultPolygonsLayer,
    MeshMapLayer,
    NorthArrowLayer,
    WellsLayer,
} from "@modules/_shared/components/SubsurfaceViewer/layers";
import { useSurfaceDataQueryByAddress } from "@modules_shared/Surface";
import { createContinuousColorScaleForMap } from "@modules_shared/components/SubsurfaceViewer/utils";
import { ViewAnnotation } from "@webviz/subsurface-viewer/dist/components/ViewAnnotation";

import { usePropertySurfaceDataByQueryAddress } from "./queryHooks";
import { state } from "./state";

import { SyncedSubsurfaceViewer } from "../_shared/components/SubsurfaceViewer";

//-----------------------------------------------------------------------------------------------------------
export function View({ moduleContext, workbenchSettings, workbenchServices }: ModuleFCProps<state>) {
    const myInstanceIdStr = moduleContext.getInstanceIdString();
    console.debug(`${myInstanceIdStr} -- render TopographicMap view`);
    const viewIds = {
        view2D: `${myInstanceIdStr} -- view2D`,
        view3D: `${myInstanceIdStr} -- view3D`,
        annotation2D: `${myInstanceIdStr} -- annotation2D`,
        annotation3D: `${myInstanceIdStr} -- annotation3D`,
    };

    const meshSurfAddr = moduleContext.useStoreValue("meshSurfaceAddress");
    const propertySurfAddr = moduleContext.useStoreValue("propertySurfaceAddress");
    const polygonsAddr = moduleContext.useStoreValue("polygonsAddress");
    const selectedWellUuids = moduleContext.useStoreValue("selectedWellUuids");
    const surfaceSettings = moduleContext.useStoreValue("surfaceSettings");
    const viewSettings = moduleContext.useStoreValue("viewSettings");
    const [resetBounds, toggleResetBounds] = React.useState<boolean>(false);
    const [axesLayer, setAxesLayer] = React.useState<Axes3DLayer | null>(null);
    const [viewportBounds, setviewPortBounds] = React.useState<[number, number, number, number] | undefined>(undefined);
    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const surfaceColorScale = workbenchSettings.useContinuousColorScale({
        gradientType: ColorScaleGradientType.Sequential,
    });
    const colorTables = createContinuousColorScaleForMap(surfaceColorScale);
    const show3D: boolean = viewSettings?.show3d ?? true;

    const meshSurfDataQuery = useSurfaceDataQueryByAddress(meshSurfAddr);

    const hasMeshSurfData = meshSurfDataQuery?.data ? true : false;
    const propertySurfDataQuery = usePropertySurfaceDataByQueryAddress(meshSurfAddr, propertySurfAddr, hasMeshSurfData);

    const wellTrajectoriesQuery = useFieldWellsTrajectoriesQuery(meshSurfAddr?.caseUuid);
    const polygonsQuery = usePolygonsDataQueryByAddress(polygonsAddr);

    const newLayers: Record<string, any>[] = [];
    const northArrowLayer = new NorthArrowLayer();
    newLayers.push(northArrowLayer.getLayer());

    let colorRange: [number, number] | null = null;

    // Mesh data query should only trigger update if the property surface address is not set or if the property surface data is loaded
    if (meshSurfDataQuery.data) {
        const surfaceLayer = new MeshMapLayer();
        // Drop conversion as soon as SubsurfaceViewer accepts typed arrays
        const newMeshData = Array.from(meshSurfDataQuery.data.valuesFloat32Arr);

        surfaceLayer.setFrame({
            origin: [meshSurfDataQuery.data.x_ori, meshSurfDataQuery.data.y_ori],
            increment: [meshSurfDataQuery.data.x_inc, meshSurfDataQuery.data.y_inc],
            count: [meshSurfDataQuery.data.x_count, meshSurfDataQuery.data.y_count],
            rotDeg: meshSurfDataQuery.data.rot_deg,
        });
        surfaceLayer.setMeshData(newMeshData);
        surfaceLayer.setColorRange(meshSurfDataQuery.data.val_min, meshSurfDataQuery.data.val_max);
        // if (surfaceSettings?.contours) {
        //     surfaceLayer.setContours(surfaceSettings.contours);
        // }
        colorRange = [meshSurfDataQuery.data.val_min, meshSurfDataQuery.data.val_max];

        if (propertySurfDataQuery.data) {
            // Drop conversion as soon as SubsurfaceViewer accepts typed arrays

            const newPropertyData = Array.from(propertySurfDataQuery.data.valuesFloat32Arr);
            surfaceLayer.setPropertyData(newPropertyData);
            surfaceLayer.setColorRange(propertySurfDataQuery.data.val_min, propertySurfDataQuery.data.val_max);
            colorRange = [propertySurfDataQuery.data.val_min, propertySurfDataQuery.data.val_max];
        }
        newLayers.push(surfaceLayer.getLayer());
    }

    // Calculate viewport bounds and axes layer from the surface bounds.
    // TODO: Should be done automatically by the component while considering all layers, with an option to lock the bounds

    React.useEffect(() => {
        if (meshSurfDataQuery.data) {
            const newBounds: Bounds = [
                meshSurfDataQuery.data.x_min,
                meshSurfDataQuery.data.y_min,
                meshSurfDataQuery.data.x_max,
                meshSurfDataQuery.data.y_max,
            ];
            if (resetBounds || shouldUpdateViewPortBounds(viewportBounds, newBounds)) {
                setviewPortBounds(newBounds);
            }
            toggleResetBounds(false);
        }
    }, [meshSurfDataQuery.data, propertySurfDataQuery.data, resetBounds, viewportBounds]);

    if (viewportBounds) {
        const axesLayer = new Axes3DLayer();
        axesLayer.setBounds([viewportBounds[0], viewportBounds[1], 0, viewportBounds[2], viewportBounds[3], 3500]);
        newLayers.push(axesLayer.getLayer());
    }

    if (polygonsQuery.data) {
        const polygonsData: PolygonData_api[] = polygonsQuery.data;
        const faultPolygonsLayer = new FaultPolygonsLayer();
        faultPolygonsLayer.setData(polygonsData);

        newLayers.push(faultPolygonsLayer.getLayer());
    }
    const wellsLayer = new WellsLayer({ render2D: !show3D });

    if (wellTrajectoriesQuery.data) {
        const wellTrajectories: WellBoreTrajectory_api[] = wellTrajectoriesQuery.data.filter((well) =>
            selectedWellUuids.includes(well.wellbore_uuid)
        );
        wellsLayer.setData(wellTrajectories, null, null);

        newLayers.push(wellsLayer.getLayer());
    }

    function onMouseEvent(event: any) {
        const clickedUWIs: Wellbore[] = [];
        if (event.type === "click") {
            if (syncHelper.isSynced(SyncSettingKey.WELLBORE)) {
                event.infos.forEach((info: any) => {
                    if (info.layer.id === wellsLayer.getId()) {
                        clickedUWIs.push({
                            type: "smda",
                            uwi: info.object.properties.uwi,
                            uuid: info.object.properties.uuid,
                        });
                    }
                });
                if (clickedUWIs.length > 0) {
                    // Publish the first selected well bore
                    syncHelper.publishValue(SyncSettingKey.WELLBORE, "global.syncValue.wellBore", clickedUWIs[0]);
                }
            }
        }
    }

    const isLoading =
        meshSurfDataQuery.isFetching ||
        propertySurfDataQuery.isFetching ||
        polygonsQuery.isFetching ||
        wellTrajectoriesQuery.isFetching;
    const isError =
        meshSurfDataQuery.isError ||
        propertySurfDataQuery.isError ||
        polygonsQuery.isError ||
        wellTrajectoriesQuery.isError;
    return (
        <div className="relative w-full h-full flex flex-col">
            <div>
                {isLoading && (
                    <div className="absolute left-0 right-0 w-full h-full bg-white bg-opacity-80 flex items-center justify-center z-10">
                        <CircularProgress />
                    </div>
                )}
                {isError && (
                    <div className="absolute left-0 right-0 w-full h-full bg-white bg-opacity-80 flex items-center justify-center z-10">
                        {"Error loading data"}
                    </div>
                )}
            </div>

            <div className="absolute top-0 right-0 z-10">
                <Button variant="contained" onClick={() => toggleResetBounds(!resetBounds)}>
                    Reset viewport bounds
                </Button>
            </div>
            <div className="z-1">
                {show3D ? (
                    <SyncedSubsurfaceViewer
                        moduleContext={moduleContext}
                        workbenchServices={workbenchServices}
                        id={viewIds.view3D}
                        bounds={viewportBounds}
                        layers={newLayers}
                        colorTables={colorTables}
                        views={{
                            layout: [1, 1],
                            showLabel: false,
                            viewports: [
                                {
                                    id: "view_1",
                                    isSync: true,
                                    show3D: show3D,
                                    layerIds: newLayers.map((layer) => layer.id) as string[],
                                },
                            ],
                        }}
                        onMouseEvent={onMouseEvent}
                    >
                        <ViewAnnotation id={viewIds.annotation3D}>
                            <ContinuousLegend
                                colorTables={colorTables}
                                colorName="Continuous"
                                min={colorRange ? colorRange[0] : undefined}
                                max={colorRange ? colorRange[1] : undefined}
                                cssLegendStyles={{ bottom: "0", right: "0" }}
                            />
                        </ViewAnnotation>
                    </SyncedSubsurfaceViewer>
                ) : (
                    <SyncedSubsurfaceViewer
                        moduleContext={moduleContext}
                        workbenchServices={workbenchServices}
                        id={viewIds.view2D}
                        bounds={viewportBounds}
                        layers={newLayers}
                        colorTables={colorTables}
                        views={{
                            layout: [1, 1],
                            showLabel: false,
                            viewports: [
                                {
                                    id: "view_2",
                                    isSync: true,
                                    show3D: false,
                                    layerIds: newLayers.map((layer) => layer.id) as string[],
                                },
                            ],
                        }}
                        onMouseEvent={onMouseEvent}
                    >
                        <ViewAnnotation id={viewIds.annotation2D}>
                            <ContinuousLegend
                                colorTables={colorTables}
                                colorName="Continuous"
                                min={colorRange ? colorRange[0] : undefined}
                                max={colorRange ? colorRange[1] : undefined}
                                cssLegendStyles={{ bottom: "0", right: "0" }}
                            />
                        </ViewAnnotation>
                    </SyncedSubsurfaceViewer>
                )}
            </div>
        </div>
    );
}
type Bounds = [number, number, number, number];
function shouldUpdateViewPortBounds(existingViewPortBounds: Bounds | undefined, newBounds: Bounds): boolean {
    if (!existingViewPortBounds) {
        return true;
    }
    // Check if bounds overlap, update if not
    if (
        existingViewPortBounds[2] < newBounds[0] ||
        existingViewPortBounds[0] > newBounds[2] ||
        existingViewPortBounds[3] < newBounds[1] ||
        existingViewPortBounds[1] > newBounds[3]
    ) {
        return true;
    }

    return false;
}
