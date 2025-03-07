import type {
    PolygonData_api,
    SurfaceDataPng_api,
    SurfaceDef_api,
    WellborePick_api,
    WellboreTrajectory_api,
} from "@api";
import type { Layer } from "@deck.gl/core";
import { GeoJsonLayer } from "@deck.gl/layers";
import { defaultColorPalettes } from "@framework/utils/colorPalettes";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import type { Vec2 } from "@lib/utils/vec2";
import { rotatePoint2Around } from "@lib/utils/vec2";
import type { GridMappedProperty_trans, GridSurface_trans } from "@modules/3DViewer/view/queries/queryDataTransforms";
import type { Layer as LayerInterface } from "@modules/_shared/LayerFramework/interfaces";
import { DrilledWellTrajectoriesLayer } from "@modules/_shared/LayerFramework/layers/implementations/DrilledWellTrajectoriesLayer";
import { DrilledWellborePicksLayer } from "@modules/_shared/LayerFramework/layers/implementations/DrilledWellborePicksLayer";
import { ColorScaleWithName } from "@modules/_shared/utils/ColorScaleWithName";
import type { WellsLayer } from "@webviz/subsurface-viewer/dist/layers";
import { ColormapLayer, Grid3DLayer } from "@webviz/subsurface-viewer/dist/layers";

import type { Rgb } from "culori";
import { parse } from "culori";
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from "geojson";

import { ObservedSurfaceLayer } from "../../LayerFramework/customLayerImplementations/ObservedSurfaceLayer";
import { RealizationGridLayer } from "../../LayerFramework/customLayerImplementations/RealizationGridLayer";
import { RealizationPolygonsLayer } from "../../LayerFramework/customLayerImplementations/RealizationPolygonsLayer";
import { RealizationSurfaceLayer } from "../../LayerFramework/customLayerImplementations/RealizationSurfaceLayer";
import { StatisticalSurfaceLayer } from "../../LayerFramework/customLayerImplementations/StatisticalSurfaceLayer";
import { AdvancedWellsLayer } from "../customDeckGlLayers/AdvancedWellsLayer";
import type { WellBorePickLayerData } from "../customDeckGlLayers/WellborePicksLayer";
import { WellborePicksLayer } from "../customDeckGlLayers/WellborePicksLayer";

export function makeDeckGlLayer(layer: LayerInterface<any, any>, colorScale?: ColorScaleWithName): Layer | null {
    const data = layer.getLayerDelegate().getData();

    if (colorScale === undefined) {
        colorScale = new ColorScaleWithName({
            colorPalette: defaultColorPalettes[0],
            gradientType: ColorScaleGradientType.Sequential,
            name: "Default",
            type: ColorScaleType.Continuous,
            steps: 10,
        });
    }

    if (!data) {
        return null;
    }
    if (layer instanceof ObservedSurfaceLayer) {
        return createMapImageLayer(
            data,
            layer.getItemDelegate().getId(),
            layer.getItemDelegate().getName(),
            colorScale,
        );
    }
    if (layer instanceof RealizationSurfaceLayer) {
        return createMapImageLayer(
            data,
            layer.getItemDelegate().getId(),
            layer.getItemDelegate().getName(),
            colorScale,
        );
    }
    if (layer instanceof StatisticalSurfaceLayer) {
        return createMapImageLayer(
            data,
            layer.getItemDelegate().getId(),
            layer.getItemDelegate().getName(),
            colorScale,
        );
    }
    if (layer instanceof RealizationPolygonsLayer) {
        return createPolygonsLayer(data, layer.getItemDelegate().getId());
    }
    if (layer instanceof DrilledWellTrajectoriesLayer) {
        return makeWellsLayer(data, layer.getItemDelegate().getId(), null);
    }
    if (layer instanceof DrilledWellborePicksLayer) {
        return createWellPicksLayer(data, layer.getItemDelegate().getId());
    }
    if (layer instanceof RealizationGridLayer) {
        return makeGrid3DLayer(
            layer.getItemDelegate().getId(),
            data.gridSurfaceData,
            data.gridParameterData,
            layer.getSettingsContext().getDelegate().getSettings().showGridLines.getDelegate().getValue(),
            colorScale,
        );
    }
    return null;
}
function createWellPicksLayer(wellPicksDataApi: WellborePick_api[], id: string): WellborePicksLayer {
    const wellPicksData: WellBorePickLayerData[] = wellPicksDataApi.map((wellPick) => {
        return {
            easting: wellPick.easting,
            northing: wellPick.northing,
            wellBoreUwi: wellPick.uniqueWellboreIdentifier,
            tvdMsl: wellPick.tvdMsl,
            md: wellPick.md,
            pickable: true,
            slotName: "",
        };
    });
    return new WellborePicksLayer({
        id: id,
        data: wellPicksData,
        pickable: true,
    });
}

function createMapImageLayer(
    layerData: SurfaceDataPng_api,
    id: string,
    name: string,
    colorScale?: ColorScaleWithName,
): ColormapLayer {
    return new ColormapLayer({
        id: id,
        name: name,
        image: `data:image/png;base64,${layerData.png_image_base64}`,
        bounds: calcBoundsForRotationAroundUpperLeftCorner(layerData.surface_def),
        rotDeg: layerData.surface_def.rot_deg,
        valueRange: [layerData.value_min, layerData.value_max],
        colorMapRange: [layerData.value_min, layerData.value_max],
        colorMapName: "Physics",
        parameters: {
            depthWriteEnabled: false,
        },
        colorMapFunction: makeColorMapFunction(colorScale, layerData.value_min, layerData.value_max),
    });
}

function calcBoundsForRotationAroundUpperLeftCorner(surfDef: SurfaceDef_api): [number, number, number, number] {
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
    const features: Feature<Geometry, GeoJsonProperties>[] = polygonsData.map((polygon) => {
        return polygonsToGeojson(polygon);
    });
    const data: FeatureCollection<Geometry, GeoJsonProperties> = {
        type: "FeatureCollection",
        features: features,
    };
    return new GeoJsonLayer({
        id: id,
        data: data,
        filled: false,
        lineWidthMinPixels: 2,
        parameters: {
            depthTest: false,
        },

        pickable: true,
    });
}
function polygonsToGeojson(polygons: PolygonData_api): Feature<Geometry, GeoJsonProperties> {
    const data: Feature<Geometry, GeoJsonProperties> = {
        type: "Feature",
        geometry: {
            type: "Polygon",
            coordinates: [zipCoords(polygons.x_arr, polygons.y_arr, polygons.z_arr)],
        },
        properties: { name: polygons.poly_id, color: [0, 0, 0, 255] },
    };
    return data;
}

function makeWellsLayer(
    fieldWellboreTrajectoriesData: WellboreTrajectory_api[],
    id: string,
    selectedWellboreUuid: string | null,
): WellsLayer {
    const tempWorkingWellsData = fieldWellboreTrajectoriesData.filter(
        (el) => el.uniqueWellboreIdentifier !== "NO 34/4-K-3 AH",
    );
    const wellLayerDataFeatures = tempWorkingWellsData.map((well) =>
        wellTrajectoryToGeojson(well, selectedWellboreUuid),
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

    const wellsLayer = new AdvancedWellsLayer({
        id: id,
        data: {
            type: "FeatureCollection",
            unit: "m",
            features: wellLayerDataFeatures,
        },
        refine: false,
        lineStyle: { width: getLineStyleWidth, color: getColor },
        wellHeadStyle: { size: getWellHeadStyleWidth, color: getColor },
        wellNameVisible: true,
        pickable: true,
        ZIncreasingDownwards: false,
        outline: false,
        lineWidthScale: 2,
    });

    return wellsLayer;
}

function wellTrajectoryToGeojson(
    wellTrajectory: WellboreTrajectory_api,
    selectedWellboreUuid: string | null,
): Record<string, unknown> {
    const point: Record<string, unknown> = {
        type: "Point",
        coordinates: [wellTrajectory.eastingArr[0], wellTrajectory.northingArr[0], -wellTrajectory.tvdMslArr[0]],
    };
    const coordinates: Record<string, unknown> = {
        type: "LineString",
        coordinates: zipCoords(wellTrajectory.eastingArr, wellTrajectory.northingArr, wellTrajectory.tvdMslArr),
    };

    let color = [100, 100, 100];
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

function zipCoords(xArr: number[], yArr: number[], zArr: number[]): number[][] {
    const coords: number[][] = [];
    for (let i = 0; i < xArr.length; i++) {
        coords.push([xArr[i], yArr[i], -zArr[i]]);
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

function makeGrid3DLayer(
    id: string,
    gridSurfaceData: GridSurface_trans,
    gridParameterData: GridMappedProperty_trans,
    showGridLines: boolean,
    colorScale?: ColorScaleWithName,
): WorkingGrid3dLayer {
    const offsetXyz = [gridSurfaceData.origin_utm_x, gridSurfaceData.origin_utm_y, 0];
    const pointsNumberArray = gridSurfaceData.pointsFloat32Arr.map((val, i) => val + offsetXyz[i % 3]);
    const polysNumberArray = gridSurfaceData.polysUint32Arr;
    const grid3dLayer = new Grid3DLayer({
        id: id,
        pointsData: pointsNumberArray,
        polysData: polysNumberArray,
        propertiesData: gridParameterData.polyPropsFloat32Arr,
        ZIncreasingDownwards: false,
        gridLines: showGridLines,
        material: { ambient: 0.4, diffuse: 0.7, shininess: 8, specularColor: [25, 25, 25] },
        pickable: true,
        colorMapName: "Physics",
        colorMapClampColor: true,
        colorMapRange: [gridParameterData.min_grid_prop_value, gridParameterData.max_grid_prop_value],
        colorMapFunction: makeColorMapFunction(
            colorScale,
            gridParameterData.min_grid_prop_value,
            gridParameterData.max_grid_prop_value,
        ),
    });
    return grid3dLayer as unknown as WorkingGrid3dLayer;
}

function makeColorMapFunction(
    colorScale: ColorScaleWithName | undefined,
    valueMin: number,
    valueMax: number,
): ((value: number) => [number, number, number]) | undefined {
    if (!colorScale) {
        return undefined;
    }

    return (value: number) => {
        const nonNormalizedValue = value * (valueMax - valueMin) + valueMin;
        const interpolatedColor = colorScale.getColorForValue(nonNormalizedValue);
        const color = parse(interpolatedColor) as Rgb;
        if (color === undefined) {
            return [0, 0, 0];
        }
        return [color.r * 255, color.g * 255, color.b * 255];
    };
}
