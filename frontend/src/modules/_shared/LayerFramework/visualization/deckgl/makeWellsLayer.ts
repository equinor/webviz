import { WellboreTrajectory_api } from "@api";
import * as bbox from "@lib/utils/boundingBox";

import { Feature, FeatureCollection, GeoJsonProperties, GeometryCollection, LineString, Point } from "geojson";

import { AdvancedWellsLayer } from "../../../customDeckGlLayers/AdvancedWellsLayer";
import { VisualizationFunctionArgs } from "../VisualizationFactory";

function wellTrajectoryToGeojson(
    wellTrajectory: WellboreTrajectory_api
): Feature<GeometryCollection, GeoJsonProperties> {
    const point: Point = {
        type: "Point",
        coordinates: [wellTrajectory.eastingArr[0], wellTrajectory.northingArr[0], -wellTrajectory.tvdMslArr[0]],
    };

    const coordinates: LineString = {
        type: "LineString",
        coordinates: zipCoords(wellTrajectory.eastingArr, wellTrajectory.northingArr, wellTrajectory.tvdMslArr),
    };

    const color = [100, 100, 100];
    const lineWidth = 2;
    const wellHeadSize = 1;

    const geometryCollection: Feature<GeometryCollection, GeoJsonProperties> = {
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

export function makeWellsLayer({
    id,
    data,
    name,
    boundingBox,
}: VisualizationFunctionArgs<any, WellboreTrajectory_api[]>): AdvancedWellsLayer {
    // Filter out some wellbores that are known to be not working - this is a temporary solution
    const filteredData = data.filter((wellbore) => wellbore.uniqueWellboreIdentifier !== "NO 34/4-K-3 AH");

    // WellsLayer requires data in GeoJSON format in a FeatureCollection
    const featureCollection: FeatureCollection = {
        type: "FeatureCollection",
        features: filteredData.map((wellTrajectory) => wellTrajectoryToGeojson(wellTrajectory)),
    };

    const bbox3d = boundingBox ? bbox.toNumArray(boundingBox) : undefined;

    return new AdvancedWellsLayer({
        id,
        data: featureCollection,
        name,
        refine: false,
        wellNameVisible: false,
        wellHeadStyle: { size: 1 },
        pickable: true,
        ZIncreasingDownwards: false,
        outline: false,
        lineStyle: {
            width: 2,
        },
        boundingBox: bbox3d,
    });
}
