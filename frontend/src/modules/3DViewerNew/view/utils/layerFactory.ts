import { SurfaceDef_api, WellborePick_api, WellboreTrajectory_api } from "@api";
import { Layer } from "@deck.gl/core";
import { defaultColorPalettes } from "@framework/utils/colorPalettes";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { GridMappedProperty_trans, GridSurface_trans } from "@modules/3DViewer/view/queries/queryDataTransforms";
import { IntersectionRealizationGridLayer } from "@modules/3DViewerNew/LayerFramework/customLayerImplementations/IntersectionRealizationGridLayer";
import { RealizationSeismicCrosslineLayer } from "@modules/3DViewerNew/LayerFramework/customLayerImplementations/RealizationSeismicCrosslineLayer";
import { RealizationSeismicDepthSliceLayer } from "@modules/3DViewerNew/LayerFramework/customLayerImplementations/RealizationSeismicDepthSliceLayer";
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
import { FenceMeshSection_trans, PolylineIntersection_trans } from "@modules/_shared/utils/wellbore";
import { WellBorePickLayerData, WellborePicksLayer } from "@modules_shared/customDeckGlLayers/WellborePicksLayer";
import { TGrid3DColoringMode } from "@webviz/subsurface-viewer";
import { Grid3DLayer, MapLayer, WellsLayer } from "@webviz/subsurface-viewer/dist/layers";

import { Rgb, parse } from "culori";
import { Feature } from "geojson";

import { createSeismicCrosslineLayerData, createSeismicInlineLayerData } from "./seismicSliceUtils";

import { RealizationGridLayer } from "../../LayerFramework/customLayerImplementations/RealizationGridLayer";
import { RealizationSurfaceLayer } from "../../LayerFramework/customLayerImplementations/RealizationSurfaceLayer";
import { AdvancedWellsLayer } from "../customDeckGlLayers/AdvancedWellsLayer";

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
    if (layer instanceof IntersectionRealizationGridLayer) {
        return makeIntersectionLayer(
            data.polylineIntersectionData,
            layer.getSettingsContext().getDelegate().getSettings().showGridLines.getDelegate().getValue(),
            colorScale
        );
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
    if (layer instanceof RealizationSeismicDepthSliceLayer) {
        const zValue = layer
            .getSettingsContext()
            .getDelegate()
            .getSettings()
            .seismicDepthSlice.getDelegate()
            .getValue();
        const layerData: SurfaceDataFloat_trans = data;
        return createSurfaceConstantZWIthPropertyLayer({
            surfaceDef: layerData.surface_def,
            propertyFloat32Arr: layerData.valuesFloat32Arr,
            zValue: zValue || 0,
            id: layer.getItemDelegate().getId(),
            name: layer.getItemDelegate().getName(),
            valueMin: layerData.value_min,
            valueMax: layerData.value_max,
            colorScale: colorScale,
            showGridLines: false,
        });
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
type SurfaceConstantZWithPropertyLayerOptions = {
    surfaceDef: SurfaceDef_api;
    propertyFloat32Arr: Float32Array;
    zValue: number;
    id: string;
    name: string;
    valueMin: number;
    valueMax: number;
    colorScale: ColorScaleWithName;
    showGridLines: boolean;
};
export function createSurfaceConstantZWIthPropertyLayer(options: SurfaceConstantZWithPropertyLayerOptions): MapLayer {
    const meshData = new Float32Array(options.propertyFloat32Arr.length);
    meshData.fill(options.zValue);
    return new MapLayer({
        "@@type": "MapLayer",
        "@@typedArraySupport": true,
        id: options.id,
        name: options.name,
        meshData: meshData,
        propertiesData: options.propertyFloat32Arr,
        frame: {
            origin: [options.surfaceDef.origin_utm_x, options.surfaceDef.origin_utm_y],
            count: [options.surfaceDef.npoints_x, options.surfaceDef.npoints_y],
            increment: [options.surfaceDef.inc_x, options.surfaceDef.inc_y],
            rotDeg: options.surfaceDef.rot_deg,
        },
        valueRange: [options.valueMin, options.valueMax],
        colorMapRange: [options.valueMin, options.valueMax],
        gridLines: options.showGridLines,
        material: false,
        smoothShading: false,
        colorMapName: "Physics",

        colorMapFunction: makeColorMapFunction(options.colorScale, options.valueMin, options.valueMax),
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

function makeIntersectionLayer(
    polylineIntersectionData: PolylineIntersection_trans,
    showGridLines: boolean,
    colorScale: ColorScaleWithName
): WorkingGrid3dLayer {
    const polyData = buildVtkStylePolyDataFromFenceSections(polylineIntersectionData.fenceMeshSections);
    const grid3dIntersectionLayer = new Grid3DLayer({
        id: "grid-3d-intersection-layer",
        pointsData: polyData.points as unknown as number[],
        polysData: polyData.polys as unknown as number[],
        propertiesData: polyData.props as unknown as number[],
        colorMapName: "Continuous",
        colorMapRange: [polylineIntersectionData.min_grid_prop_value, polylineIntersectionData.max_grid_prop_value],
        colorMapClampColor: true,
        coloringMode: TGrid3DColoringMode.Property,
        colorMapFunction: makeColorMapFunction(
            colorScale,
            polylineIntersectionData.min_grid_prop_value,
            polylineIntersectionData.max_grid_prop_value
        ),
        ZIncreasingDownwards: false,
        gridLines: showGridLines,
        material: { ambient: 0.4, diffuse: 0.7, shininess: 8, specularColor: [25, 25, 25] },
        pickable: false,
    });
    return grid3dIntersectionLayer as unknown as WorkingGrid3dLayer;
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
