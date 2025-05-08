import { GeoJsonLayer } from "@deck.gl/layers";
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from "geojson";

import type { PolygonData_api } from "@api";
import type { DeepReadonly } from "@modules/_shared/DataProviderFramework/framework/utils/immutabilityUtils";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type {
    RealizationPolygonsData,
    RealizationPolygonsSettings,
<<<<<<<< HEAD:frontend/src/modules/_shared/DataProviderFramework/visualization/deckgl/makeRealizationPolygonsLayer.ts
} from "../../layers/implementations/RealizationPolygonsLayer";
========
} from "../customDataProviderImplementations/RealizationPolygonsProvider";
>>>>>>>> origin/dpf-improve-dep-tree:frontend/src/modules/2DViewer/DataProviderFramework/visualization/makeRealizationPolygonsLayer.ts

function zipCoords(xArr: readonly number[], yArr: readonly number[], zArr: readonly number[]): number[][] {
    const coords: number[][] = [];
    for (let i = 0; i < xArr.length; i++) {
        coords.push([xArr[i], yArr[i], -zArr[i]]);
    }

    return coords;
}

function polygonsToGeojson(polygons: DeepReadonly<PolygonData_api>): Feature<Geometry, GeoJsonProperties> {
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
}: TransformerArgs<RealizationPolygonsSettings, RealizationPolygonsData>): GeoJsonLayer | null {
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
