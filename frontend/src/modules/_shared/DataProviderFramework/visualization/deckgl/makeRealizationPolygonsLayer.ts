import { hasUncaughtExceptionCaptureCallback } from "node:process";

import { GeoJsonLayer } from "@deck.gl/layers";
import { parseHex, type Rgb } from "culori";
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from "geojson";

import type { PolygonData_api } from "@api";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type {
    RealizationPolygonsData,
    RealizationPolygonsSettings,
} from "../../dataProviders/implementations/RealizationPolygonsProvider";
import { Setting } from "../../settings/settingsDefinitions";

function zipCoords(xArr: readonly number[], yArr: readonly number[], zArr: readonly number[]): number[][] {
    const coords: number[][] = [];
    for (let i = 0; i < xArr.length; i++) {
        coords.push([xArr[i], yArr[i], -zArr[i]]);
    }

    return coords;
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

export function makeRealizationPolygonsLayer({
    id,
    name,
    getData,
    getSetting,
}: TransformerArgs<RealizationPolygonsSettings, RealizationPolygonsData>): GeoJsonLayer | null {
    const polygonsData = getData();

    if (!polygonsData) {
        return null;
    }
    const visualizationSettings = getSetting(Setting.POLYGON_VISUALIZATION);
    const hexColor = visualizationSettings?.color;
    const rgbColor = hexColor ? (parseHex(hexColor) as Rgb) : undefined;

    const features: Feature<Geometry, GeoJsonProperties>[] = polygonsData.map((polygon) => {
        return polygonsToGeojson(polygon);
    });
    const data: FeatureCollection<Geometry, GeoJsonProperties> = {
        type: "FeatureCollection",
        features: features,
    };
    console.log(polygonsData);

    return new GeoJsonLayer({
        id,
        name,
        data: data,
        filled: visualizationSettings?.fill,
        getLineColor: rgbColor ? [rgbColor.r * 255, rgbColor.g * 255, rgbColor.b * 255, 255] : undefined,
        getFillColor: rgbColor ? [rgbColor.r * 255, rgbColor.g * 255, rgbColor.b * 255, 255] : undefined,
        lineWidthMinPixels: visualizationSettings?.lineThickness,

        parameters: {
            depthTest: false,
        },

        pickable: true,
    });
}
