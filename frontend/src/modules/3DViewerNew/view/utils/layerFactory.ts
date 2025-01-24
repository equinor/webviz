import { WellborePick_api, WellboreTrajectory_api } from "@api";
import { Layer } from "@deck.gl/core";
import { defaultColorPalettes } from "@framework/utils/colorPalettes";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { GridMappedProperty_trans, GridSurface_trans } from "@modules/3DViewer/view/queries/queryDataTransforms";
import { RealizationSeismicCrosslineLayer } from "@modules/3DViewerNew/LayerFramework/customLayerImplementations/RealizationSeismicCrosslineLayer";
import { RealizationSeismicInlineLayer } from "@modules/3DViewerNew/LayerFramework/customLayerImplementations/RealizationSeismicInlineLayer";
import {
    SeismicCrosslineData_trans,
    SeismicInlineData_trans,
} from "@modules/3DViewerNew/settings/queries/queryDataTransforms";
import { Layer as LayerInterface } from "@modules/_shared/LayerFramework/interfaces";
import { DrilledWellTrajectoriesLayer } from "@modules/_shared/LayerFramework/layers/implementations/DrilledWellTrajectoriesLayer";
import { DrilledWellborePicksLayer } from "@modules/_shared/LayerFramework/layers/implementations/DrilledWellborePicksLayer";
import { SurfaceDataFloat_trans } from "@modules/_shared/Surface/queryDataTransforms";
import { ColorScaleWithName } from "@modules/_shared/utils/ColorScaleWithName";
import { TGrid3DColoringMode } from "@webviz/subsurface-viewer";
import { Grid3DLayer, MapLayer, WellsLayer } from "@webviz/subsurface-viewer/dist/layers";

import { Rgb, parse } from "culori";
import { Feature } from "geojson";

import { createSeismicCrosslineLayerData, createSeismicInlineLayerData } from "./seismicSliceUtils";

import { RealizationGridLayer } from "../../LayerFramework/customLayerImplementations/RealizationGridLayer";
import { RealizationSurfaceLayer } from "../../LayerFramework/customLayerImplementations/RealizationSurfaceLayer";
import { AdvancedWellsLayer } from "../customDeckGlLayers/AdvancedWellsLayer";
import { WellBorePickLayerData, WellborePicksLayer } from "../customDeckGlLayers/WellborePicksLayer";

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
            colorScale
        );
    }
    if (layer instanceof RealizationSurfaceLayer) {
        return createSurfaceMeshLayer(
            data,
            layer.getItemDelegate().getId(),
            layer.getItemDelegate().getName(),
            colorScale
        );
    }
    if (layer instanceof RealizationSeismicInlineLayer) {
        const seismicData: SeismicInlineData_trans = data;
        const seismicLayerData = createSeismicInlineLayerData(seismicData);

        const coloringMode: TGrid3DColoringMode = TGrid3DColoringMode.Property;
        const grid3dLayer = new Grid3DLayer({
            id: layer.getItemDelegate().getId(),
            name: layer.getItemDelegate().getName(),
            pointsData: seismicLayerData.pointsFloat32Arr,
            polysData: seismicLayerData.polysUint32Arr,
            propertiesData: seismicLayerData.propertyFloat32Arr,
            ZIncreasingDownwards: true,
            gridLines: false,
            colorMapRange: [seismicLayerData.minValue, seismicLayerData.maxValue],
            colorMapName: "Physics",
            colorMapClampColor: true,
            coloringMode: coloringMode,
            material: { ambient: 0, diffuse: 0.7, shininess: 1, specularColor: [25, 25, 25] },
            colorMapFunction: makeColorMapFunction(colorScale, seismicLayerData.minValue, seismicLayerData.maxValue),

            pickable: true,
        });
        return grid3dLayer as unknown as WorkingGrid3dLayer;
    }
    if (layer instanceof RealizationSeismicCrosslineLayer) {
        const seismicData: SeismicCrosslineData_trans = data;
        const seismicLayerData = createSeismicCrosslineLayerData(seismicData);

        const coloringMode: TGrid3DColoringMode = TGrid3DColoringMode.Property;
        const grid3dLayer = new Grid3DLayer({
            id: layer.getItemDelegate().getId(),
            name: layer.getItemDelegate().getName(),
            pointsData: seismicLayerData.pointsFloat32Arr,
            polysData: seismicLayerData.polysUint32Arr,
            propertiesData: seismicLayerData.propertyFloat32Arr,
            ZIncreasingDownwards: true,
            gridLines: false,
            colorMapRange: [seismicLayerData.minValue, seismicLayerData.maxValue],
            colorMapName: "Physics",
            colorMapClampColor: true,
            coloringMode: coloringMode,
            material: { ambient: 0, diffuse: 0.7, shininess: 1, specularColor: [25, 25, 25] },
            colorMapFunction: makeColorMapFunction(colorScale, seismicLayerData.minValue, seismicLayerData.maxValue),

            pickable: true,
        });
        return grid3dLayer as unknown as WorkingGrid3dLayer;
    }
    return null;
}

export function createSurfaceMeshLayer(
    layerData: SurfaceDataFloat_trans,
    id: string,
    name: string,
    colorScale?: ColorScaleWithName,
    showContours?: boolean | number[],
    showGridLines?: boolean,
    useSmoothShading?: boolean,
    useMaterial?: boolean,
    property_data?: Float32Array | null
): MapLayer {
    return new MapLayer({
        "@@type": "MapLayer",
        "@@typedArraySupport": true,
        id: "mesh-layer",
        name: name,
        meshData: layerData.valuesFloat32Arr,
        // propertiesData: layerData.valuesFloat32Arr,
        frame: {
            origin: [layerData.surface_def.origin_utm_x, layerData.surface_def.origin_utm_y],
            count: [layerData.surface_def.npoints_x, layerData.surface_def.npoints_y],
            increment: [layerData.surface_def.inc_x, layerData.surface_def.inc_y],
            rotDeg: layerData.surface_def.rot_deg,
        },
        valueRange: [layerData.value_min, layerData.value_max],
        colorMapRange: [layerData.value_min, layerData.value_max],
        // isContoursDepth: true,
        // contours: [0, 10],
        gridLines: false,
        material: useMaterial,
        smoothShading: useSmoothShading,
        colorMapName: "Physics",

        colorMapFunction: makeColorMapFunction(colorScale, layerData.value_min, layerData.value_max),
    });
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

function makeWellsLayer(
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
    colorScale?: ColorScaleWithName
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
            gridParameterData.max_grid_prop_value
        ),
    });
    return grid3dLayer as unknown as WorkingGrid3dLayer;
}

function makeColorMapFunction(
    colorScale: ColorScaleWithName | undefined,
    valueMin: number,
    valueMax: number
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
