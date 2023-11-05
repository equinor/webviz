import { PolygonData_api } from "@api";

import { Feature, FeatureCollection } from "geojson";

export function createFaultPolygonsFeatureCollection(polygonsData: PolygonData_api[]): FeatureCollection {
    const features: Feature[] = polygonsData.map((polygonData) => {
        return createFaultsPolygonsFeature(polygonData);
    });
    const data: FeatureCollection = {
        type: "FeatureCollection",
        features: features,
    };
    return data;
}
function createFaultsPolygonsFeature(surfacePolygon: PolygonData_api): Feature {
    const data: Feature = {
        type: "Feature",
        geometry: {
            type: "Polygon",
            coordinates: [zipCoords(surfacePolygon.x_arr, surfacePolygon.y_arr, surfacePolygon.z_arr)],
        },
        properties: { name: surfacePolygon.poly_id, color: [0, 0, 0, 255] },
    };
    return data;
}

function zipCoords(x_arr: number[], y_arr: number[], z_arr: number[]): number[][] {
    const coords: number[][] = [];
    for (let i = 0; i < x_arr.length; i++) {
        coords.push([x_arr[i], y_arr[i], -z_arr[i]]);
    }

    return coords;
}
