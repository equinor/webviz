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
import { useFieldWellsTrajectoriesQuery } from "@modules/_shared/WellBore/queryHooks";
import SubsurfaceViewer, { ViewportType } from "@webviz/subsurface-viewer";
import { ViewAnnotation } from "@webviz/subsurface-viewer/dist/components/ViewAnnotation";
import { Grid3DLayer, WellsLayer } from "@webviz/subsurface-viewer/dist/layers/";

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
export function View({ moduleContext, workbenchSettings, workbenchSession }: ModuleFCProps<state>) {
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
    const colorScale = workbenchSettings.useContinuousColorScale({ gradientType: ColorScaleGradientType.Sequential });
    const colorTables = createContinuousColorScaleForMap(colorScale);

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
    const gridPolylineIntersectionQuery = useGridPolylineIntersection(
        firstEnsemble?.getCaseUuid() ?? null,
        firstEnsemble?.getEnsembleName() ?? null,
        gridName,
        parameterName,
        realization,
        polyLine
    );
    const wellTrajectoriesQuery = useFieldWellsTrajectoriesQuery(firstEnsemble?.getCaseUuid() ?? undefined);
    const bounds = boundingBox
        ? [boundingBox.xmin, boundingBox.ymin, boundingBox.zmin, boundingBox.xmax, boundingBox.ymax, boundingBox.zmax]
        : [0, 0, 0, 100, 100, 100];

    const newLayers: Record<string, unknown>[] = [
        createNorthArrowLayer(),
        {
            "@@type": "AxesLayer",
            id: "axes-layer",
            bounds: bounds,
            ZIncreasingDownwards: true,
        },
    ];

    const polyLineLayer = new GeoJsonLayer({
        id: "geojson-layer",
        data: polyLineToGeojsonLineString(polyLine),
        pickable: true,
        stroked: false,
        filled: true,
        lineWidthScale: 20,
        lineWidthMinPixels: 2,
    });

    let grid3dLayer: WorkingGrid3dLayer | null = null;

    if (gridSurfaceQuery.data) {
        const offsetXyz = [gridSurfaceQuery.data.origin_utm_x, gridSurfaceQuery.data.origin_utm_y, 0];
        const pointsNumberArray = gridSurfaceQuery.data.pointsFloat32Arr.map((val, i) => val + offsetXyz[i % 3]);

        const polysNumberArray = gridSurfaceQuery.data.polysUint32Arr;
        grid3dLayer = new Grid3DLayer({
            id: "grid-3d-layer",
            pointsData: pointsNumberArray,
            polysData: polysNumberArray,
            propertiesData: gridParameterQuery.data ? gridParameterQuery.data.polyPropsFloat32Arr : undefined,
            colorMapName: "Continuous",
            ZIncreasingDownwards: false,
        }) as unknown as WorkingGrid3dLayer;
    }

    let wellsLayer = new WellsLayer();
    if (wellTrajectoriesQuery.data) {
        const wellTrajectories: WellBoreTrajectory_api[] = wellTrajectoriesQuery.data.filter((well) =>
            selectedWellUuids.includes(well.wellbore_uuid)
        );

        const wellLayerDataFeatures = wellTrajectories.map((well) => wellTrajectoryToGeojson(well));
        wellsLayer = new WellsLayer({
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
    }
    const grid3dIntersectionLayers: WorkingGrid3dLayer[] = [];
    if (gridPolylineIntersectionQuery.data) {
        gridPolylineIntersectionQuery.data.fence_mesh_sections.map((section, idx) => {
            const directionX = section.end_utm_x - section.start_utm_x;
            const directionY = section.end_utm_y - section.start_utm_y;
            const magnitude = Math.sqrt(directionX ** 2 + directionY ** 2);
            const unitDirectionX = directionX / magnitude;
            const unitDirectionY = directionY / magnitude;
            const pointsFloat32Arr = [];
            console.log(section.vertices_uz_arr);
            for (let i = 0; i < section.vertices_uz_arr.length; i += 2) {
                const u = section.vertices_uz_arr[i];
                const x = u * unitDirectionX + section.start_utm_x; // Project U onto the X direction
                const y = u * unitDirectionY + section.start_utm_y; // Project U onto the Y direction
                const z = section.vertices_uz_arr[i + 1];
                pointsFloat32Arr.push(x, y, z);
            }

            const polysUint32Arr = section.polys_arr;
            const polyPropsFloat32Arr = section.poly_props_arr;

            // Should be a single layer. Duplicates at the hinges?
            const grid3dIntersectionSegmentLayer = new Grid3DLayer({
                id: "grid-3d-intersection-layer" + idx,
                pointsData: pointsFloat32Arr,
                polysData: polysUint32Arr,
                propertiesData: polyPropsFloat32Arr,
                colorMapName: "Continuous",
                ZIncreasingDownwards: false,
            }) as unknown as WorkingGrid3dLayer;
            grid3dIntersectionLayers.push(grid3dIntersectionSegmentLayer);
        });
    }

    const layers = [wellsLayer, polyLineLayer, grid3dLayer, ...grid3dIntersectionLayers].filter(
        (layer) => layer !== null
    ) as Layer[];
    const view3DLayerIds: string[] = [wellsLayer.id];

    const view2DLayerIds: string[] = [wellsLayer.id, polyLineLayer.id];
    const view3DIntersectLayerIds: string[] = [polyLineLayer.id];
    if (grid3dLayer) {
        view3DLayerIds.push(grid3dLayer.id);
        view2DLayerIds.push(grid3dLayer.id);
    }
    if (grid3dIntersectionLayers.length) {
        view3DLayerIds.push(...grid3dIntersectionLayers.map((layer) => layer.id));
        view3DIntersectLayerIds.push(...grid3dIntersectionLayers.map((layer) => layer.id));
    }

    return (
        <div className="relative w-full h-full flex flex-col">
            <SubsurfaceViewer
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
                            layerIds: view3DLayerIds,
                        },
                        {
                            id: "view_2d",
                            isSync: false,
                            show3D: false,
                            layerIds: view2DLayerIds,
                        },
                        {
                            id: "view_3d_intersect",
                            isSync: true,
                            show3D: true,

                            layerIds: view3DIntersectLayerIds,
                        },
                    ], //TODO: Changes to this prop will trigger a re-render!!!!
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
            </SubsurfaceViewer>

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
