import type { PolygonData_api } from "@api";
import { GeoJsonLayer } from "@deck.gl/layers";
import type { FactoryFunctionArgs } from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";

import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from "geojson";

import type {
    RealizationPolygonsData,
    RealizationPolygonsSettings,
} from "../customLayerImplementations/RealizationPolygonsLayer";

function zipCoords(xArr: number[], yArr: number[], zArr: number[]): number[][] {
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
}: FactoryFunctionArgs<RealizationPolygonsSettings, RealizationPolygonsData>): GeoJsonLayer | null {
    const polygonsData = getData();

    if (!polygonsData) {
        return null;
    }

    const features: Feature<Geometry, GeoJsonProperties>[] = polygonsData.map((polygon) => {
        return polygonsToGeojson(polygon);
    });
    const data: FeatureCollection<Geometry, GeoJsonProperties> = {
        type: "FeatureCollection",
        features: features,
    };

    return new GeoJsonLayer({
        id,
        name,
        data: data,
        filled: false,
        lineWidthMinPixels: 2,
        parameters: {
            depthTest: false,
        },

        pickable: true,
    });
}
