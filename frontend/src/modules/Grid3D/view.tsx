import React from "react";

import { WellBoreTrajectory_api } from "@api";
import { Layer } from "@deck.gl/core/typed";
import { GeoJsonLayer } from "@deck.gl/layers/typed";
import { ContinuousLegend } from "@emerson-eps/color-tables";
import { ModuleViewProps } from "@framework/Module";
import { useFirstEnsembleInEnsembleSet } from "@framework/WorkbenchSession";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { createContinuousColorScaleForMap } from "@modules/SubsurfaceMap/_utils";
import { wellTrajectoryToGeojson } from "@modules/SubsurfaceMap/_utils/subsurfaceMap";
import { SyncedSubsurfaceViewer } from "@modules/SubsurfaceMap/components/SyncedSubsurfaceViewer";
import { useFieldWellsTrajectoriesQuery } from "@modules/_shared/WellBore/queryHooks";
import SubsurfaceViewer, { ViewStateType, ViewportType } from "@webviz/subsurface-viewer";
import { ViewAnnotation } from "@webviz/subsurface-viewer/dist/components/ViewAnnotation";
import { AxesLayer, Grid3DLayer, NorthArrow3DLayer, WellsLayer } from "@webviz/subsurface-viewer/dist/layers/";

import { FeatureCollection } from "geojson";

import { FenceMeshSection_trans } from "./queryDataTransforms";
import { useGridPolylineIntersection, useGridProperty, useGridSurface } from "./queryHooks";
import state from "./state";

type WorkingGrid3dLayer = {
    pointsData: Float32Array;
    polysData: Uint32Array;
    propertiesData: Float32Array;
    colorMapName: string;
    ZIncreasingDownwards: boolean;
} & Layer;

export function View({ viewContext, workbenchSettings, workbenchServices, workbenchSession }: ModuleViewProps<state>) {
    const myInstanceIdStr = viewContext.getInstanceIdString();
    const viewIds = {
        view: `${myInstanceIdStr}--view`,
        annotation: `${myInstanceIdStr}--annotation`,
    };
    // From Workbench
    const firstEnsemble = useFirstEnsembleInEnsembleSet(workbenchSession);

    // State
    const gridName = viewContext.useStoreValue("gridName");
    const parameterName = viewContext.useStoreValue("parameterName");
    const realization = viewContext.useStoreValue("realization");
    const boundingBox = viewContext.useStoreValue("boundingBox");
    const polyLine = viewContext.useStoreValue("polyLine");

    const singleKLayer = viewContext.useStoreValue("singleKLayer");
    const selectedWellUuids = viewContext.useStoreValue("selectedWellUuids");
    const showGridLines = viewContext.useStoreValue("showGridLines");
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

    // Grid surface queries
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

    // Grid intersection query
    const gridPolylineIntersectionQuery = useGridPolylineIntersection(
        firstEnsemble?.getCaseUuid() ?? null,
        firstEnsemble?.getEnsembleName() ?? null,
        gridName,
        parameterName,
        realization,
        polyLinePoints
    );

    let minPropValue = Number.MAX_VALUE;
    let maxPropValue = -Number.MAX_VALUE;
    if (gridParameterQuery.data) {
        minPropValue = Math.min(gridParameterQuery.data.min_grid_prop_value, minPropValue);
        maxPropValue = Math.max(gridParameterQuery.data.max_grid_prop_value, maxPropValue);
    }
    if (gridPolylineIntersectionQuery.data) {
        minPropValue = Math.min(gridPolylineIntersectionQuery.data.min_grid_prop_value, minPropValue);
        maxPropValue = Math.max(gridPolylineIntersectionQuery.data.max_grid_prop_value, maxPropValue);
    }
    console.log(`minMaxPropValue=${minPropValue <= maxPropValue ? `${minPropValue}, ${maxPropValue}` : "N/A"}`);

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
            colorMapRange: [minPropValue, maxPropValue],
            ZIncreasingDownwards: false,
            gridLines: showGridLines,
            material: { ambient: 0.4, diffuse: 0.7, shininess: 8, specularColor: [25, 25, 25] },
        });
        layers.push(grid3dLayer as unknown as WorkingGrid3dLayer);
    }

    if (gridPolylineIntersectionQuery.data) {
        const polyData = buildVtkStylePolyDataFromFenceSections(gridPolylineIntersectionQuery.data.fenceMeshSections);
        const grid3dIntersectionLayer = new Grid3DLayer({
            id: "grid-3d-intersection-layer",
            pointsData: polyData.points,
            polysData: polyData.polys,
            propertiesData: polyData.props,
            colorMapName: "Continuous",
            colorMapRange: [minPropValue, maxPropValue],
            ZIncreasingDownwards: false,
            gridLines: showGridLines,
            material: { ambient: 0.4, diffuse: 0.7, shininess: 8, specularColor: [25, 25, 25] },
        });
        layers.push(grid3dIntersectionLayer as unknown as WorkingGrid3dLayer);
    }

    return (
        <div className="relative w-full h-full flex flex-col">
            <SyncedSubsurfaceViewer
                viewContext={viewContext}
                workbenchServices={workbenchServices}
                id={viewIds.view}
                bounds={
                    boundingBox ? [boundingBox.xmin, boundingBox.ymin, boundingBox.xmax, boundingBox.ymax] : undefined
                }
                colorTables={colorTables}
                layers={layers}
                lights={{
                    headLight: { intensity: 1.0 },
                    ambientLight: { intensity: 1.0 },
                    // ambientLight: { intensity: 0.6 },
                    // directionalLights: [{ intensity: 0.4, direction: [0, 0, -1] }],
                }}
                views={{
                    layout: [2, 1],
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
                        // {
                        //     id: "view_2d",
                        //     isSync: false,
                        //     show3D: false,
                        //     layerIds: [
                        //         "north-arrow-layer",
                        //         "axes-layer",
                        //         "wells-layer",
                        //         "polyline-layer",
                        //         "grid-3d-layer",
                        //     ],
                        // },
                        {
                            id: "view_3d_intersect",
                            isSync: true,
                            show3D: true,

                            layerIds: ["polyline-layer", "grid-3d-intersection-layer"],
                        },
                    ],
                }}
            >
                <ViewAnnotation id={viewIds.annotation}>
                    <ContinuousLegend
                        colorTables={colorTables}
                        colorName="Continuous"
                        min={minPropValue}
                        max={maxPropValue}
                        isRangeShown={minPropValue <= maxPropValue}
                        cssLegendStyles={{ bottom: "0", right: "0" }}
                    />
                </ViewAnnotation>
            </SyncedSubsurfaceViewer>

            <div className="absolute bottom-5 right-5 italic text-pink-400">{viewContext.getInstanceIdString()}</div>
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

interface PolyDataVtk {
    points: Float32Array;
    polys: Uint32Array;
    props: Float32Array;
}

function buildVtkStylePolyDataFromFenceSections(fenceSections: FenceMeshSection_trans[]): PolyDataVtk {
    const startTS = performance.now();

    // Calculate sizes of typed arrays
    let totNumVertices = 0;
    let totNumPolygons = 0;
    let totNumConnectivities = 0;
    for (const section of fenceSections) {
        totNumVertices += section.verticesUzFloat32Arr.length / 2;
        totNumPolygons += section.verticesPerPolyUintArr.length;
        totNumConnectivities += section.polyIndicesUintArr.length;
    }

    const pointsFloat32Arr = new Float32Array(3 * totNumVertices);
    const polysUint32Arr = new Uint32Array(totNumPolygons + totNumConnectivities);
    const polyPropsFloat32Arr = new Float32Array(totNumPolygons);

    let floatPointsDstIdx = 0;
    let polysDstIdx = 0;
    let propsDstIdx = 0;
    for (const section of fenceSections) {
        // uv to xyz
        const directionX = section.end_utm_x - section.start_utm_x;
        const directionY = section.end_utm_y - section.start_utm_y;
        const magnitude = Math.sqrt(directionX ** 2 + directionY ** 2);
        const unitDirectionX = directionX / magnitude;
        const unitDirectionY = directionY / magnitude;

        const connOffset = floatPointsDstIdx / 3;

        for (let i = 0; i < section.verticesUzFloat32Arr.length; i += 2) {
            const u = section.verticesUzFloat32Arr[i];
            const z = section.verticesUzFloat32Arr[i + 1];
            const x = u * unitDirectionX + section.start_utm_x;
            const y = u * unitDirectionY + section.start_utm_y;

            pointsFloat32Arr[floatPointsDstIdx++] = x;
            pointsFloat32Arr[floatPointsDstIdx++] = y;
            pointsFloat32Arr[floatPointsDstIdx++] = z;
        }

        // Fix poly indexes for each section
        const numPolysInSection = section.verticesPerPolyUintArr.length;
        let srcIdx = 0;
        for (let i = 0; i < numPolysInSection; i++) {
            const numVertsInPoly = section.verticesPerPolyUintArr[i];
            polysUint32Arr[polysDstIdx++] = numVertsInPoly;

            for (let j = 0; j < numVertsInPoly; j++) {
                polysUint32Arr[polysDstIdx++] = section.polyIndicesUintArr[srcIdx++] + connOffset;
            }
        }

        polyPropsFloat32Arr.set(section.polyPropsFloat32Arr, propsDstIdx);
        propsDstIdx += numPolysInSection;
    }

    console.debug(`buildVtkStylePolyDataFromFenceSections() took: ${(performance.now() - startTS).toFixed(1)}ms`);

    return {
        points: pointsFloat32Arr,
        polys: polysUint32Arr,
        props: polyPropsFloat32Arr,
    };
}
