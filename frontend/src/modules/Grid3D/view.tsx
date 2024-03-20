import React from "react";

import { WellBoreTrajectory_api } from "@api";
import { Layer } from "@deck.gl/core/typed";
import { GeoJsonLayer } from "@deck.gl/layers/typed";
import { ContinuousLegend } from "@emerson-eps/color-tables";
import { ModuleFCProps } from "@framework/Module";
import { useFirstEnsembleInEnsembleSet } from "@framework/WorkbenchSession";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import {
    createContinuousColorScaleForMap,
    createNorthArrowLayer,
    createWellBoreHeaderLayer,
    createWellboreTrajectoryLayer,
} from "@modules/SubsurfaceMap/_utils";
import { wellTrajectoryToGeojson } from "@modules/SubsurfaceMap/_utils/subsurfaceMap";
import { SyncedSubsurfaceViewer } from "@modules/SubsurfaceMap/components/SyncedSubsurfaceViewer";
import { useFieldWellsTrajectoriesQuery } from "@modules/_shared/WellBore/queryHooks";
import SubsurfaceViewer, { ViewStateType, ViewportType } from "@webviz/subsurface-viewer";
import { ViewAnnotation } from "@webviz/subsurface-viewer/dist/components/ViewAnnotation";
import { AxesLayer, Grid3DLayer, NorthArrow3DLayer, WellsLayer } from "@webviz/subsurface-viewer/dist/layers/";

import { FeatureCollection } from "geojson";
import { isEqual } from "lodash";

import { useGridPolylineIntersection, useGridProperty, useGridSurface } from "./queryHooks";
import state from "./state";

type WorkingGrid3dLayer = {
    pointsData: Float32Array;
    polysData: Uint32Array;
    propertiesData: Float32Array;
    colorMapName: string;
    ZIncreasingDownwards: boolean;
} & Layer;
export function View({ moduleContext, workbenchSettings, workbenchServices, workbenchSession }: ModuleFCProps<state>) {
    const myInstanceIdStr = moduleContext.getInstanceIdString();
    const viewIds = {
        view: `${myInstanceIdStr}--view`,
        annotation: `${myInstanceIdStr}--annotation`,
    };
    // From Workbench
    const firstEnsemble = useFirstEnsembleInEnsembleSet(workbenchSession);

    // State
    const gridName = moduleContext.useStoreValue("gridName");
    const parameterName = moduleContext.useStoreValue("parameterName");
    const realization = moduleContext.useStoreValue("realization");
    const boundingBox = moduleContext.useStoreValue("boundingBox");
    const polyLine = moduleContext.useStoreValue("polyLine");

    const singleKLayer = moduleContext.useStoreValue("singleKLayer");
    const selectedWellUuids = moduleContext.useStoreValue("selectedWellUuids");
    const showGridLines = moduleContext.useStoreValue("showGridLines");
    const colorScale = workbenchSettings.useContinuousColorScale({ gradientType: ColorScaleGradientType.Sequential });
    const colorTables = createContinuousColorScaleForMap(colorScale);

    const bounds = boundingBox
        ? [boundingBox.xmin, boundingBox.ymin, boundingBox.zmin, boundingBox.xmax, boundingBox.ymax, boundingBox.zmax]
        : [0, 0, 0, 100, 100, 100];

    const northArrowLayer = new NorthArrow3DLayer({
        id: "north-arrow-layer",
        visible: true,
    });
    const axesLayer = new AxesLayer({
        id: "axes-layer",
        bounds: bounds as [number, number, number, number, number, number],
        visible: true,
        ZIncreasingDownwards: true,
    });

    const layers: Layer[] = [northArrowLayer, axesLayer];

    // Polyline
    const polyLinePoints: number[] = [];
    polyLine.forEach((point) => {
        polyLinePoints.push(point.x);
        polyLinePoints.push(point.y);
    });
    if (polyLinePoints.length > 0) {
        const polyLineLayer = new GeoJsonLayer({
            id: "polyline-layer",
            data: polyLineToGeojsonLineString(polyLinePoints),
            pickable: true,
            stroked: false,
            filled: true,
            lineWidthScale: 20,
            lineWidthMinPixels: 2,
        });
        layers.push(polyLineLayer);
    }

    // Wells
    const wellTrajectoriesQuery = useFieldWellsTrajectoriesQuery(firstEnsemble?.getCaseUuid() ?? undefined);
    if (wellTrajectoriesQuery.data) {
        const wellTrajectories: WellBoreTrajectory_api[] = wellTrajectoriesQuery.data.filter((well) =>
            selectedWellUuids.includes(well.wellbore_uuid)
        );

        const wellLayerDataFeatures = wellTrajectories.map((well) => wellTrajectoryToGeojson(well));
        const wellsLayer = new WellsLayer({
            id: "wells-layer",
            data: {
                type: "FeatureCollection",
                unit: "m",
                features: wellLayerDataFeatures,
            },
            refine: false,
            lineStyle: { width: 2 },
            wellHeadStyle: { size: 1 },
            pickable: true,
            ZIncreasingDownwards: false,
        });
        layers.push(wellsLayer);
    }

    // Grid surface
    const gridSurfaceQuery = useGridSurface(
        firstEnsemble?.getCaseUuid() ?? null,
        firstEnsemble?.getEnsembleName() ?? null,
        gridName,
        realization,
        singleKLayer
    );
    const gridParameterQuery = useGridProperty(
        firstEnsemble?.getCaseUuid() ?? null,
        firstEnsemble?.getEnsembleName() ?? null,
        gridName,
        parameterName,
        realization,
        singleKLayer
    );
    if (gridSurfaceQuery.data && gridParameterQuery.data) {
        const offsetXyz = [gridSurfaceQuery.data.origin_utm_x, gridSurfaceQuery.data.origin_utm_y, 0];
        const pointsNumberArray = gridSurfaceQuery.data.pointsFloat32Arr.map((val, i) => val + offsetXyz[i % 3]);
        const polysNumberArray = gridSurfaceQuery.data.polysUint32Arr;
        const grid3dLayer = new Grid3DLayer({
            id: "grid-3d-layer",
            pointsData: pointsNumberArray,
            polysData: polysNumberArray,
            propertiesData: gridParameterQuery.data.polyPropsFloat32Arr,
            colorMapName: "Continuous",
            ZIncreasingDownwards: false,
            gridLines: showGridLines,
        }) as unknown as WorkingGrid3dLayer;
        layers.push(grid3dLayer);
    }

    // Grid intersection
    const gridPolylineIntersectionQuery = useGridPolylineIntersection(
        firstEnsemble?.getCaseUuid() ?? null,
        firstEnsemble?.getEnsembleName() ?? null,
        gridName,
        parameterName,
        realization,
        polyLinePoints
    );

    // Todo use typed arrays
    const pointsFloat32Arr: number[] = [];
    const polysUint32Arr: number[] = [];
    const polyPropsFloat32Arr: number[] = [];
    if (gridPolylineIntersectionQuery.data) {
        let currentPointIndexOffset = 0;

        // Todo cleanup
        gridPolylineIntersectionQuery.data.fence_mesh_sections.map((section, idx) => {
            const directionX = section.end_utm_x - section.start_utm_x;
            const directionY = section.end_utm_y - section.start_utm_y;
            const magnitude = Math.sqrt(directionX ** 2 + directionY ** 2);
            const unitDirectionX = directionX / magnitude;
            const unitDirectionY = directionY / magnitude;
            const pointsFloat32ArrSeg = [];

            for (let i = 0; i < section.vertices_uz_arr.length; i += 2) {
                const u = section.vertices_uz_arr[i];
                const x = u * unitDirectionX + section.start_utm_x;
                const y = u * unitDirectionY + section.start_utm_y;
                const z = section.vertices_uz_arr[i + 1];
                pointsFloat32ArrSeg.push(x, y, z);
            }
            const polyPropsFloat32ArrSeg = section.poly_props_arr;
            let i = 0;
            while (i < section.polys_arr.length) {
                const count = section.polys_arr[i];
                polysUint32Arr.push(count);
                i++;

                for (let j = 0; j < count; j++, i++) {
                    polysUint32Arr.push(section.polys_arr[i] + currentPointIndexOffset);
                }
            }
            pointsFloat32ArrSeg.forEach((val) => pointsFloat32Arr.push(val));
            currentPointIndexOffset = pointsFloat32Arr.length / 3;
            polyPropsFloat32Arr.push(...polyPropsFloat32ArrSeg);
        });

        const grid3dIntersectionLayer = new Grid3DLayer({
            id: "grid-3d-intersection-layer",
            pointsData: pointsFloat32Arr,
            polysData: polysUint32Arr,
            propertiesData: polyPropsFloat32Arr,
            colorMapName: "Continuous",
            ZIncreasingDownwards: false,
            gridLines: showGridLines,
        }) as unknown as WorkingGrid3dLayer;
        layers.push(grid3dIntersectionLayer);
    }

    return (
        <div className="relative w-full h-full flex flex-col">
            <SyncedSubsurfaceViewer
                moduleContext={moduleContext}
                workbenchServices={workbenchServices}
                id={viewIds.view}
                bounds={
                    boundingBox ? [boundingBox.xmin, boundingBox.ymin, boundingBox.xmax, boundingBox.ymax] : undefined
                }
                colorTables={colorTables}
                layers={layers}
                views={{
                    layout: [3, 1],
                    showLabel: false,

                    viewports: [
                        {
                            id: "view_3d",
                            isSync: true,
                            show3D: true,
                            layerIds: [
                                "north-arrow-layer",
                                "axes-layer",
                                "wells-layer",
                                "grid-3d-layer",
                                "grid-3d-intersection-layer",
                            ],
                        },
                        {
                            id: "view_2d",
                            isSync: false,
                            show3D: false,
                            layerIds: [
                                "north-arrow-layer",
                                "axes-layer",
                                "wells-layer",
                                "polyline-layer",
                                "grid-3d-layer",
                            ],
                        },
                        {
                            id: "view_3d_intersect",
                            isSync: true,
                            show3D: true,

                            layerIds: ["polyline-layer", "grid-3d-intersection-layer"],
                        },
                    ],
                }}
            >
                {/* {" "}
                <ViewAnnotation id={viewIds.annotation}>
                    <ContinuousLegend
                        colorTables={colorTables}
                        colorName="Continuous"
                        // min={propertyRange ? propertyRange[0] : undefined}
                        // max={propertyRange ? propertyRange[1] : undefined}
                        cssLegendStyles={{ bottom: "0", right: "0" }}
                    />
                </ViewAnnotation> */}
            </SyncedSubsurfaceViewer>

            <div className="absolute bottom-5 right-5 italic text-pink-400">{moduleContext.getInstanceIdString()}</div>
        </div>
    );
}

function polyLineToGeojsonLineString(polyLine: number[]): FeatureCollection {
    // Expect an array with even numbers of elements.
    // Each pair of elements is a coordinate.
    const coordinates = [];
    for (let i = 0; i < polyLine.length; i += 2) {
        coordinates.push([polyLine[i], polyLine[i + 1]]);
    }
    return {
        type: "FeatureCollection",
        features: [
            {
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: coordinates,
                },
                properties: {
                    color: "green", // Custom property to use in styling (optional)
                },
            },
        ],
    };
}
