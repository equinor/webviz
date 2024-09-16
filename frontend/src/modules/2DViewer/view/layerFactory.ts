import { PolygonData_api, SurfaceDef_api, WellboreTrajectory_api } from "@api";
import { Layer } from "@deck.gl/core/typed";
import { GeoJsonLayer } from "@deck.gl/layers/typed";
import { ColorScale } from "@lib/utils/ColorScale";
import { Vec2, rotatePoint2Around } from "@lib/utils/vec2";
import { GridMappedProperty_trans, GridSurface_trans } from "@modules/3DViewer/view/queries/queryDataTransforms";
import { SurfaceDataFloat_trans } from "@modules/_shared/Surface/queryDataTransforms";
import {
    ColormapLayer,
    Grid3DLayer,
    Hillshading2DLayer,
    MapLayer,
    WellsLayer,
} from "@webviz/subsurface-viewer/dist/layers";

import { Feature } from "geojson";
import { SurfaceDataPng } from "src/api/models/SurfaceDataPng";

import { DrilledWellTrajectoriesLayer } from "../layers/implementations/layers/DrilledWellTrajectoriesLayer/DrilledWellTrajectoriesLayer";
import { ObservedSurfaceLayer } from "../layers/implementations/layers/ObservedSurfaceLayer/ObservedSurfaceLayer";
import { RealizationGridLayer } from "../layers/implementations/layers/RealizationGridLayer/RealizationGridLayer";
import { RealizationPolygonsLayer } from "../layers/implementations/layers/RealizationPolygonsLayer/RealizationPolygonsLayer";
import { RealizationSurfaceLayer } from "../layers/implementations/layers/RealizationSurfaceLayer/RealizationSurfaceLayer";
import { StatisticalSurfaceLayer } from "../layers/implementations/layers/StatisticalSurfaceLayer/StatisticalSurfaceLayer";
import { Layer as LayerInterface } from "../layers/interfaces";

export function makeLayer(layer: LayerInterface<any, any>): Layer | null {
    const data = layer.getLayerDelegate().getData();

    if (!data) {
        return null;
    }
    if (layer instanceof ObservedSurfaceLayer) {
        return createMapImageLayer(data, layer.getItemDelegate().getId());
    }
    if (layer instanceof RealizationSurfaceLayer) {
        return createMapImageLayer(data, layer.getItemDelegate().getId());
    }
    if (layer instanceof StatisticalSurfaceLayer) {
        return createMapFloatLayer(data, layer.getItemDelegate().getId());
    }
    if (layer instanceof RealizationPolygonsLayer) {
        return createPolygonsLayer(data, layer.getItemDelegate().getId());
    }
    if (layer instanceof DrilledWellTrajectoriesLayer) {
        return makeWellsLayer(data, layer.getItemDelegate().getId(), null);
    }
    if (layer instanceof RealizationGridLayer) {
        return makeGrid3DLayer(layer.getItemDelegate().getId(), data.gridSurfaceData, data.gridParameterData, false);
    }
    return null;
}

function createMapFloatLayer(layerData: SurfaceDataFloat_trans, id: string): MapLayer {
    return new MapLayer({
        id: id,
        meshData: layerData.valuesFloat32Arr,
        typedArraySupport: true,
        frame: {
            origin: [layerData.surface_def.origin_utm_x, layerData.surface_def.origin_utm_y],
            count: [layerData.surface_def.npoints_x, layerData.surface_def.npoints_y],
            increment: [layerData.surface_def.inc_x, layerData.surface_def.inc_y],
            rotDeg: layerData.surface_def.rot_deg,
        },
        contours: [0, 100],
        isContoursDepth: true,
        gridLines: false,
        material: true,
        smoothShading: true,
        colorMapName: "Physics",
        parameters: {
            depthTest: false,
        },
        depthTest: false,
    });
}

function createMapImageLayer(layerData: SurfaceDataPng, id: string): ColormapLayer {
    return new ColormapLayer({
        id: id,
        image: `data:image/png;base64,${layerData.png_image_base64}`,
        bounds: _calcBoundsForRotationAroundUpperLeftCorner(layerData.surface_def),
        rotDeg: layerData.surface_def.rot_deg,
        valueRange: [layerData.value_min, layerData.value_max],
        colorMapRange: [layerData.value_min, layerData.value_max],
        colorMapName: "Physics",
        parameters: {
            depthTest: false,
        },
    });
}
function _calcBoundsForRotationAroundUpperLeftCorner(surfDef: SurfaceDef_api): [number, number, number, number] {
    const width = (surfDef.npoints_x - 1) * surfDef.inc_x;
    const height = (surfDef.npoints_y - 1) * surfDef.inc_y;
    const orgRotPoint: Vec2 = { x: surfDef.origin_utm_x, y: surfDef.origin_utm_y };
    const orgTopLeft: Vec2 = { x: surfDef.origin_utm_x, y: surfDef.origin_utm_y + height };

    const transTopLeft: Vec2 = rotatePoint2Around(orgTopLeft, orgRotPoint, (surfDef.rot_deg * Math.PI) / 180);
    const tLeft = transTopLeft.x;
    const tBottom = transTopLeft.y - height;
    const tRight = transTopLeft.x + width;
    const tTop = transTopLeft.y;

    const bounds: [number, number, number, number] = [tLeft, tBottom, tRight, tTop];

    return bounds;
}

function createPolygonsLayer(polygonsData: PolygonData_api[], id: string): GeoJsonLayer {
    const features: Record<string, unknown>[] = polygonsData.map((polygon) => {
        return polygonsToGeojson(polygon);
    });
    const data: Record<string, unknown> = {
        type: "FeatureCollection",
        unit: "m",
        features: features,
    };
    return new GeoJsonLayer({
        id: id,
        data: data,
        // opacity: 0.5,
        filled: false,
        lineWidthMinPixels: 2,
        parameters: {
            depthTest: false,
        },

        pickable: true,
    });
}
function polygonsToGeojson(polygons: PolygonData_api): Record<string, unknown> {
    const data: Record<string, unknown> = {
        type: "Feature",
        geometry: {
            type: "Polygon",
            coordinates: [zipCoords(polygons.x_arr, polygons.y_arr, polygons.z_arr)],
        },
        properties: { name: polygons.poly_id, color: [0, 0, 0, 255] },
    };
    return data;
}

export function makeWellsLayer(
    fieldWellboreTrajectoriesData: WellboreTrajectory_api[],
    id: string,
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
        id: id,
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
type WorkingGrid3dLayer = {
    pointsData: Float32Array;
    polysData: Uint32Array;
    propertiesData: Float32Array;
    colorMapName: string;
    ZIncreasingDownwards: boolean;
} & Layer;

export function makeGrid3DLayer(
    id: string,
    gridSurfaceData: GridSurface_trans,
    gridParameterData: GridMappedProperty_trans,
    showGridLines: boolean
    // colorScale: ColorScale
): WorkingGrid3dLayer {
    const offsetXyz = [gridSurfaceData.origin_utm_x, gridSurfaceData.origin_utm_y, 0];
    const pointsNumberArray = gridSurfaceData.pointsFloat32Arr.map((val, i) => val + offsetXyz[i % 3]);
    const polysNumberArray = gridSurfaceData.polysUint32Arr;
    console.log(gridParameterData);
    const grid3dLayer = new Grid3DLayer({
        id: id,
        pointsData: pointsNumberArray,
        polysData: polysNumberArray,
        propertiesData: gridParameterData.polyPropsFloat32Arr,
        ZIncreasingDownwards: false,
        gridLines: true,
        material: { ambient: 0.4, diffuse: 0.7, shininess: 8, specularColor: [25, 25, 25] },
        pickable: true,
        colorMapName: "Physics",
        colorMapClampColor: true,
        colorMapRange: [gridParameterData.min_grid_prop_value, gridParameterData.max_grid_prop_value],
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
