import type { WellboreTrajectory_api } from "@api";
import * as bbox from "@lib/utils/bbox";
import type { FactoryFunctionArgs } from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";
import { makeDrilledWellTrajectoriesBoundingBox } from "@modules/_shared/LayerFramework/visualization/deckgl/boundingBoxes/makeDrilledWellTrajectoriesBoundingBox";
import { WellsLayer } from "@modules/_shared/customDeckGlLayers/WellsLayer/WellsLayer";
import type { WellsLayerData } from "@modules/_shared/customDeckGlLayers/WellsLayer/WellsLayer";

import type { Feature, GeoJsonProperties, GeometryCollection, LineString, Point } from "geojson";

function wellTrajectoryToGeojson(
    wellTrajectory: WellboreTrajectory_api,
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

export function makeDrilledWellTrajectoriesLayer(
    args: FactoryFunctionArgs<any, WellboreTrajectory_api[], any>,
): WellsLayer | null {
    const { id, getData } = args;

    const fieldWellboreTrajectoriesData = getData();

    if (!fieldWellboreTrajectoriesData) {
        return null;
    }

    // Filter out some wellbores that are known to be not working - this is a temporary solution
    const tempWorkingWellsData = fieldWellboreTrajectoriesData.filter(
        (el) => el.uniqueWellboreIdentifier !== "NO 34/4-K-3 AH",
    );

    const wellLayerDataFeatures = tempWorkingWellsData.map((well) => wellTrajectoryToGeojson(well));

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

    const wellsLayerData: WellsLayerData = [];
    for (const wellboreData of fieldWellboreTrajectoriesData) {
        const properties = {
            uuid: wellboreData.wellboreUuid,
            name: wellboreData.uniqueWellboreIdentifier,
            mdArray: wellboreData.mdArr,
        };
        const coordinates: [number, number, number][] = wellboreData.eastingArr.map((easting, index) => {
            return [easting, wellboreData.northingArr[index], -wellboreData.tvdMslArr[index]];
        });
        wellsLayerData.push({ properties, coordinates });
    }

    const boundingBox = makeDrilledWellTrajectoriesBoundingBox(args);

    if (!boundingBox) {
        return null;
    }

    const wellsLayer = new WellsLayer({
        id: id,
        data: wellsLayerData,
        zIncreaseDownwards: true,
        boundingBox: bbox.toNumArray(boundingBox),
    });

    return wellsLayer;
}
