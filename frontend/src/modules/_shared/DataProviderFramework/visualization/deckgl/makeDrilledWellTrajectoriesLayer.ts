import type { WellsLayer } from "@webviz/subsurface-viewer/dist/layers";
import type { Feature, GeoJsonProperties, GeometryCollection, LineString, Point } from "geojson";

import type { WellboreTrajectory_api } from "@api";
import { AdvancedWellsLayer } from "@modules/_shared/customDeckGlLayers/AdvancedWellsLayer";

import type { TransformerArgs } from "../VisualizationAssembler";

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

function zipCoords(xArr: readonly number[], yArr: readonly number[], zArr: readonly number[]): number[][] {
    const coords: number[][] = [];
    for (let i = 0; i < xArr.length; i++) {
        coords.push([xArr[i], yArr[i], -zArr[i]]);
    }

    return coords;
}

export function makeDrilledWellTrajectoriesLayer({
    id,
    name,
    getData,
}: TransformerArgs<any, WellboreTrajectory_api[], any>): WellsLayer | null {
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

    const wellsLayer = new AdvancedWellsLayer({
        id: id,
        name,
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
