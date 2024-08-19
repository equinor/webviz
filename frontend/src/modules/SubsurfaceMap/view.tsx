import React from "react";

import { BoundingBox2d_api, PolygonData_api, SurfaceDef_api, WellboreTrajectory_api } from "@api";
import { ContinuousLegend } from "@emerson-eps/color-tables";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleViewProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Wellbore } from "@framework/types/wellbore";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { usePolygonsDataQueryByAddress } from "@modules/_shared/Polygons";
import { useFieldWellboreTrajectoriesQuery } from "@modules/_shared/WellBore/queryHooks";
import { useSurfaceDataQueryByAddress } from "@modules_shared/Surface";
import { ViewAnnotation } from "@webviz/subsurface-viewer/dist/components/ViewAnnotation";

import {
    createAxesLayer,
    createContinuousColorScaleForMap,
    createNorthArrowLayer,
    createSurfaceMeshLayer,
    createSurfacePolygonsLayer,
    createWellBoreHeaderLayer,
    createWellboreTrajectoryLayer,
} from "./_utils";
import { SyncedSubsurfaceViewer } from "./components/SyncedSubsurfaceViewer";
import { Interfaces } from "./interfaces";

type Bounds = [number, number, number, number];

const updateViewPortBounds = (
    existingViewPortBounds: Bounds | undefined,
    resetBounds: boolean,
    surfaceBB: BoundingBox2d_api
): Bounds => {
    const updatedBounds: Bounds = [surfaceBB.min_x, surfaceBB.min_y, surfaceBB.max_x, surfaceBB.max_y];

    if (!existingViewPortBounds || resetBounds) {
        console.debug("updateViewPortBounds: no existing bounds, returning updated bounds");
        return updatedBounds;
    }

    // Check if bounds overlap
    if (
        existingViewPortBounds[2] < updatedBounds[0] || // existing right edge is to the left of updated left edge
        existingViewPortBounds[0] > updatedBounds[2] || // existing left edge is to the right of updated right edge
        existingViewPortBounds[3] < updatedBounds[1] || // existing bottom edge is above updated top edge
        existingViewPortBounds[1] > updatedBounds[3] // existing top edge is below updated bottom edge
    ) {
        console.debug("updateViewPortBounds: bounds don't overlap, returning updated bounds");
        return updatedBounds; // Return updated bounds since they don't overlap
    }

    // Otherwise, return the existing bounds
    return existingViewPortBounds;
};

//-----------------------------------------------------------------------------------------------------------
export function View({
    viewContext,
    workbenchSettings,
    workbenchServices,
    workbenchSession,
}: ModuleViewProps<Interfaces>) {
    const myInstanceIdStr = viewContext.getInstanceIdString();
    console.debug(`${myInstanceIdStr} -- render TopographicMap view`);
    const viewIds = {
        view2D: `${myInstanceIdStr} -- view2D`,
        view3D: `${myInstanceIdStr} -- view3D`,
        annotation2D: `${myInstanceIdStr} -- annotation2D`,
        annotation3D: `${myInstanceIdStr} -- annotation3D`,
    };

    const ensembleSet = useEnsembleSet(workbenchSession);

    const meshSurfAddr = viewContext.useSettingsToViewInterfaceValue("meshSurfaceAddress");
    const propertySurfAddr = viewContext.useSettingsToViewInterfaceValue("propertySurfaceAddress");
    const polygonsAddr = viewContext.useSettingsToViewInterfaceValue("polygonsAddress");
    const selectedWellUuids = viewContext.useSettingsToViewInterfaceValue("selectedWellUuids");
    const surfaceSettings = viewContext.useSettingsToViewInterfaceValue("surfaceSettings");
    const viewSettings = viewContext.useSettingsToViewInterfaceValue("viewSettings");
    const [resetBounds, toggleResetBounds] = React.useState<boolean>(false);
    const [axesLayer, setAxesLayer] = React.useState<Record<string, unknown> | null>(null);
    const [viewportBounds, setviewPortBounds] = React.useState<[number, number, number, number] | undefined>(undefined);
    const syncedSettingKeys = viewContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const surfaceColorScale = workbenchSettings.useContinuousColorScale({
        gradientType: ColorScaleGradientType.Sequential,
    });
    const colorTables = createContinuousColorScaleForMap(surfaceColorScale);
    const show3D: boolean = viewSettings?.show3d ?? true;

    const meshSurfDataQuery = useSurfaceDataQueryByAddress(meshSurfAddr, "float", null, true);

    let hasMeshSurfData = false;
    let resampleTo: SurfaceDef_api | null = null;
    if (meshSurfDataQuery.data) {
        hasMeshSurfData = true;
        resampleTo = meshSurfDataQuery.data.surface_def;
    }
    const propertySurfDataQuery = useSurfaceDataQueryByAddress(propertySurfAddr, "float", resampleTo, hasMeshSurfData);

    let fieldIdentifier: null | string = null;
    if (meshSurfAddr) {
        const ensembleIdent = new EnsembleIdent(meshSurfAddr.caseUuid, meshSurfAddr.ensemble);
        fieldIdentifier = ensembleSet.findEnsemble(ensembleIdent)?.getFieldIdentifier() ?? null;
    }
    const wellTrajectoriesQuery = useFieldWellboreTrajectoriesQuery(fieldIdentifier ?? undefined);
    const polygonsQuery = usePolygonsDataQueryByAddress(polygonsAddr);

    const newLayers: Record<string, unknown>[] = [createNorthArrowLayer()];

    let colorRange: [number, number] | null = null;

    // Mesh data query should only trigger update if the property surface address is not set or if the property surface data is loaded
    if (meshSurfDataQuery.data && !propertySurfAddr) {
        const surfaceLayer: Record<string, unknown> = createSurfaceMeshLayer(
            meshSurfDataQuery.data.surface_def,
            meshSurfDataQuery.data.valuesFloat32Arr,
            surfaceSettings
        );
        newLayers.push(surfaceLayer);
        colorRange = [meshSurfDataQuery.data.value_min, meshSurfDataQuery.data.value_max];
    } else if (meshSurfDataQuery.data && propertySurfDataQuery.data) {
        const surfaceLayer: Record<string, unknown> = createSurfaceMeshLayer(
            meshSurfDataQuery.data.surface_def,
            meshSurfDataQuery.data.valuesFloat32Arr,
            surfaceSettings,
            propertySurfDataQuery.data.valuesFloat32Arr
        );
        newLayers.push(surfaceLayer);
        colorRange = [propertySurfDataQuery.data.value_min, propertySurfDataQuery.data.value_max];
    }

    // Calculate viewport bounds and axes layer from the surface bounds.
    // TODO: Should be done automatically by the component while considering all layers, with an option to lock the bounds

    React.useEffect(() => {
        if (meshSurfDataQuery.data) {
            const surfaceBoundingBox = meshSurfDataQuery.data.transformed_bbox_utm;

            setviewPortBounds(updateViewPortBounds(viewportBounds, resetBounds, surfaceBoundingBox));
            toggleResetBounds(false);

            const axesLayer: Record<string, unknown> = createAxesLayer([
                surfaceBoundingBox.min_x,
                surfaceBoundingBox.min_y,
                0,
                surfaceBoundingBox.max_x,
                surfaceBoundingBox.max_y,
                3500,
            ]);
            setAxesLayer(axesLayer);
        }
    }, [meshSurfDataQuery.data, propertySurfDataQuery.data, resetBounds, viewportBounds]);

    axesLayer && newLayers.push(axesLayer);

    if (polygonsQuery.data) {
        const polygonsData: PolygonData_api[] = polygonsQuery.data;
        const polygonsLayer: Record<string, unknown> = createSurfacePolygonsLayer(polygonsData);
        newLayers.push(polygonsLayer);
    }
    if (wellTrajectoriesQuery.data) {
        const wellTrajectories: WellboreTrajectory_api[] = wellTrajectoriesQuery.data.filter((well) =>
            selectedWellUuids.includes(well.wellboreUuid)
        );
        const wellTrajectoryLayer: Record<string, unknown> = createWellboreTrajectoryLayer(wellTrajectories);
        const wellBoreHeaderLayer: Record<string, unknown> = createWellBoreHeaderLayer(wellTrajectories);
        newLayers.push(wellTrajectoryLayer);
        newLayers.push(wellBoreHeaderLayer);
    }

    function onMouseEvent(event: any) {
        const clickedUWIs: Wellbore[] = [];
        if (event.type === "click") {
            if (syncHelper.isSynced(SyncSettingKey.WELLBORE)) {
                event.infos.forEach((info: any) => {
                    if (info.layer.id === "wells-layer") {
                        clickedUWIs.push({
                            type: "smda",
                            uwi: info.object.properties.uwi,
                            uuid: info.object.properties.uuid,
                        });
                    }
                    if (info.layer.id === "well-header-layer") {
                        clickedUWIs.push({
                            type: "smda",
                            uwi: info.object.uwi,
                            uuid: info.object.uuid,
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
                        viewContext={viewContext}
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
                        viewContext={viewContext}
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
