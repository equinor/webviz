import { BoundingBox3d_api, WellboreTrajectory_api } from "@api";
import { Layer } from "@deck.gl/core";
import { ColorScale } from "@lib/utils/ColorScale";
import { TGrid3DColoringMode } from "@webviz/subsurface-viewer";
import { AxesLayer, Grid3DLayer, WellsLayer } from "@webviz/subsurface-viewer/dist/layers";

import { Feature } from "geojson";

import {
    FenceMeshSection_trans,
    GridMappedProperty_trans,
    GridSurface_trans,
    PolylineIntersection_trans,
} from "../queries/queryDataTransforms";

export function makeAxesLayer(gridModelBoundingBox3d: BoundingBox3d_api): AxesLayer {
    const axesBounds = gridModelBoundingBox3d
        ? [
              gridModelBoundingBox3d.xmin,
              gridModelBoundingBox3d.ymin,
              gridModelBoundingBox3d.zmin,
              gridModelBoundingBox3d.xmax,
              gridModelBoundingBox3d.ymax,
              gridModelBoundingBox3d.zmax,
          ]
        : [0, 0, 0, 100, 100, 100];

    return new AxesLayer({
        id: "axes-layer",
        bounds: axesBounds as [number, number, number, number, number, number],
        visible: true,
        ZIncreasingDownwards: true,
    });
}

type WorkingGrid3dLayer = {
    pointsData: Float32Array;
    polysData: Uint32Array;
    propertiesData: Float32Array;
    colorMapName: string;
    ZIncreasingDownwards: boolean;
} & Layer;

export function makeGrid3DLayer(
    gridSurfaceData: GridSurface_trans,
    gridParameterData: GridMappedProperty_trans,
    showGridLines: boolean,
    colorScale: ColorScale
): WorkingGrid3dLayer {
    const offsetXyz = [gridSurfaceData.origin_utm_x, gridSurfaceData.origin_utm_y, 0];
    const pointsNumberArray = gridSurfaceData.pointsFloat32Arr.map((val, i) => val + offsetXyz[i % 3]);
    const polysNumberArray = gridSurfaceData.polysUint32Arr;
    const grid3dLayer = new Grid3DLayer({
        id: "grid3d-layer",
        pointsData: pointsNumberArray,
        polysData: polysNumberArray,
        propertiesData: gridParameterData.polyPropsFloat32Arr,
        ZIncreasingDownwards: false,
        gridLines: showGridLines,
        material: { ambient: 0.4, diffuse: 0.7, shininess: 8, specularColor: [25, 25, 25] },
        pickable: true,
        colorMapName: "Continuous",
        colorMapClampColor: true,
        colorMapRange: [colorScale.getMin(), colorScale.getMax()],
        /*
        colorMapFunction: (value: number) => {
            const interpolatedColor = colorScale.getColorPalette().getInterpolatedColor(value);
            // const nonNormalizedValue = value * (colorScale.getMax() - colorScale.getMin()) + colorScale.getMin();
            const color = parse(interpolatedColor) as Rgb; // colorScale.getColorForValue(nonNormalizedValue)) as Rgb;
            if (color === undefined) {
                return [0, 0, 0];
            }
            return [color.r * 255, color.g * 255, color.b * 255];
        },
        */
    });
    return grid3dLayer as unknown as WorkingGrid3dLayer;
}

export function makeIntersectionLayer(
    polylineIntersectionData: PolylineIntersection_trans,
    showGridLines: boolean,
    colorScale: ColorScale
): WorkingGrid3dLayer {
    const polyData = buildVtkStylePolyDataFromFenceSections(polylineIntersectionData.fenceMeshSections);
    const grid3dIntersectionLayer = new Grid3DLayer({
        id: "grid-3d-intersection-layer",
        pointsData: polyData.points as unknown as number[],
        polysData: polyData.polys as unknown as number[],
        propertiesData: polyData.props as unknown as number[],
        colorMapName: "Continuous",
        colorMapRange: [colorScale.getMin(), colorScale.getMax()],
        colorMapClampColor: true,
        coloringMode: TGrid3DColoringMode.Property,
        ZIncreasingDownwards: false,
        gridLines: showGridLines,
        material: { ambient: 0.4, diffuse: 0.7, shininess: 8, specularColor: [25, 25, 25] },
        pickable: false,
    });
    return grid3dIntersectionLayer as unknown as WorkingGrid3dLayer;
}

export function makeWellsLayer(
    fieldWellboreTrajectoriesData: WellboreTrajectory_api[],
    selectedWellboreUuid: string | null
): WellsLayer {
    const tempWorkingWellsData = fieldWellboreTrajectoriesData.filter(
        (el) => el.uniqueWellboreIdentifier !== "NO 34/4-K-3 AH"
    );
    const wellLayerDataFeatures = tempWorkingWellsData.map((well) =>
        wellTrajectoryToGeojson(well, selectedWellboreUuid)
    );

    function getLineStyleWidth(object: Feature): number {
        if (object.properties && "lineWidth" in object.properties) {
            return object.properties.lineWidth as number;
        }
        return 2;
    }

    function getWellHeadStyleWidth(object: Feature): number {
        if (object.properties && "wellHeadSize" in object.properties) {
            return object.properties.wellHeadSize as number;
        }
        return 1;
    }

    function getColor(object: Feature): [number, number, number, number] {
        if (object.properties && "color" in object.properties) {
            return object.properties.color as [number, number, number, number];
        }
        return [50, 50, 50, 100];
    }

    const wellsLayer = new WellsLayer({
        id: "wells-layer",
        data: {
            type: "FeatureCollection",
            unit: "m",
            features: wellLayerDataFeatures,
        },
        refine: false,
        lineStyle: { width: getLineStyleWidth, color: getColor },
        wellHeadStyle: { size: getWellHeadStyleWidth, color: getColor },
        pickable: true,
        ZIncreasingDownwards: false,
    });

    return wellsLayer;
}

export function wellTrajectoryToGeojson(
    wellTrajectory: WellboreTrajectory_api,
    selectedWellboreUuid: string | null
): Record<string, unknown> {
    const point: Record<string, unknown> = {
        type: "Point",
        coordinates: [wellTrajectory.eastingArr[0], wellTrajectory.northingArr[0], -wellTrajectory.tvdMslArr[0]],
    };
    const coordinates: Record<string, unknown> = {
        type: "LineString",
        coordinates: zipCoords(wellTrajectory.eastingArr, wellTrajectory.northingArr, wellTrajectory.tvdMslArr),
    };

    let color = [150, 150, 150];
    let lineWidth = 2;
    let wellHeadSize = 1;
    if (wellTrajectory.wellboreUuid === selectedWellboreUuid) {
        color = [255, 0, 0];
        lineWidth = 5;
        wellHeadSize = 10;
    }

    const geometryCollection: Record<string, unknown> = {
        type: "Feature",
        geometry: {
            type: "GeometryCollection",
            geometries: [point, coordinates],
        },
        properties: {
            uuid: wellTrajectory.wellboreUuid,
            name: wellTrajectory.uniqueWellboreIdentifier,
            uwi: wellTrajectory.uniqueWellboreIdentifier,
            color,
            md: [wellTrajectory.mdArr],
            lineWidth,
            wellHeadSize,
        },
    };

    return geometryCollection;
}

function zipCoords(x_arr: number[], y_arr: number[], z_arr: number[]): number[][] {
    const coords: number[][] = [];
    for (let i = 0; i < x_arr.length; i++) {
        coords.push([x_arr[i], y_arr[i], -z_arr[i]]);
    }

    return coords;
}

interface PolyDataVtk {
    points: Float32Array;
    polys: Uint32Array;
    props: Float32Array;
}

function buildVtkStylePolyDataFromFenceSections(fenceSections: FenceMeshSection_trans[]): PolyDataVtk {
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

    return {
        points: pointsFloat32Arr,
        polys: polysUint32Arr,
        props: polyPropsFloat32Arr,
    };
}
