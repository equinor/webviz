import type { WellboreTrajectory_api } from "@api";
import type { Color } from "@deck.gl/core";
import type { GlobalTopicDefinitions } from "@framework/WorkbenchServices";
import { DiscLayer } from "@modules/3DViewerNew/customDeckGlLayers/DiscLayer";
import type { GeoWellFeature } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeDrilledWellTrajectoriesLayer";
import type {
    HoverVisualizationsFunctions,
    TransformerArgs,
    VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { WellsLayer } from "@webviz/subsurface-viewer/dist/layers";
import type { LineString, Point } from "geojson";

export function makeDrilledWellTrajectoriesHoverVisualizationFunctions(
    args: TransformerArgs<any, WellboreTrajectory_api[], any>,
): HoverVisualizationsFunctions<VisualizationTarget.DECK_GL> {
    const { id, getData } = args;

    const wellboreTrajectories = getData();

    if (!wellboreTrajectories) {
        return {};
    }

    return {
        "global.hoverMd": (hoveredMd: GlobalTopicDefinitions["global.hoverMd"] | null) => {
            const wellboreTrajectory = wellboreTrajectories.find(
                (wellTrajectory) => wellTrajectory.wellboreUuid === hoveredMd?.wellboreUuid,
            );

            if (!wellboreTrajectory || !hoveredMd) {
                return [];
            }

            let hoveredMdPoint3d: [number, number, number] = [0, 0, 0];
            let normal: [number, number, number] = [0, 0, 1];

            for (const [index, point] of wellboreTrajectory.mdArr.entries()) {
                if (point >= hoveredMd.md) {
                    // Interpolate the coordinates
                    const prevPoint = wellboreTrajectory.mdArr[index - 1];
                    const thisPoint = wellboreTrajectory.mdArr[index];

                    const prevX = wellboreTrajectory.eastingArr[index - 1];
                    const prevY = wellboreTrajectory.northingArr[index - 1];
                    const prevZ = wellboreTrajectory.tvdMslArr[index - 1];
                    const thisX = wellboreTrajectory.eastingArr[index];
                    const thisY = wellboreTrajectory.northingArr[index];
                    const thisZ = wellboreTrajectory.tvdMslArr[index];

                    const ratio = (hoveredMd.md - prevPoint) / (thisPoint - prevPoint);
                    const x = prevX + ratio * (thisX - prevX);
                    const y = prevY + ratio * (thisY - prevY);
                    const z = prevZ + ratio * (thisZ - prevZ);
                    hoveredMdPoint3d = [x, y, -z];

                    const dx = thisX - prevX;
                    const dy = thisY - prevY;
                    const dz = thisZ - prevZ;

                    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    normal = length === 0 ? [0, 0, 1] : [dx / length, dy / length, -dz / length];

                    break;
                }
            }

            const wellLayerDataFeatures = [wellTrajectoryToGeojson(wellboreTrajectory, null)];

            return [
                new WellsLayer({
                    id: `${id}-hovered-well`,
                    data: {
                        type: "FeatureCollection",
                        features: wellLayerDataFeatures,
                    },
                    refine: false,
                    lineStyle: { width: 3, color: [255, 0, 0] },
                    wellHeadStyle: {
                        size: 0,
                    },
                    pickable: false,
                    wellNameVisible: false,
                    ZIncreasingDownwards: false,
                }),
                new DiscLayer({
                    id: `${id}-hovered-md-point`,
                    centerPoint: hoveredMdPoint3d,
                    radius: 100,
                    height: 50,
                    normalVector: normal,
                    numberOfSegments: 32,
                    color: [255, 0, 0],
                    opacity: 1,
                }),
            ];
        },
    };
}

function wellTrajectoryToGeojson(
    wellTrajectory: WellboreTrajectory_api,
    selectedWellboreUuid: string | null,
): GeoWellFeature {
    const wellHeadPoint: Point = {
        type: "Point",
        coordinates: [wellTrajectory.eastingArr[0], wellTrajectory.northingArr[0], -wellTrajectory.tvdMslArr[0]],
    };
    const trajectoryLineString: LineString = {
        type: "LineString",
        coordinates: zipCoords(wellTrajectory.eastingArr, wellTrajectory.northingArr, wellTrajectory.tvdMslArr),
    };

    let color = [150, 150, 150] as Color;
    let lineWidth = 2;
    let wellHeadSize = 1;
    if (wellTrajectory.wellboreUuid === selectedWellboreUuid) {
        color = [255, 0, 0];
        lineWidth = 5;
        wellHeadSize = 10;
    }

    const geometryCollection: GeoWellFeature = {
        type: "Feature",
        geometry: {
            type: "GeometryCollection",
            geometries: [wellHeadPoint, trajectoryLineString],
        },
        properties: {
            uuid: wellTrajectory.wellboreUuid,
            uwi: wellTrajectory.uniqueWellboreIdentifier,
            lineWidth,
            wellHeadSize,
            name: wellTrajectory.uniqueWellboreIdentifier,
            color,
            md: [wellTrajectory.mdArr],
        },
    };

    return geometryCollection;
}

function zipCoords(x_arr: number[], y_arr: number[], z_arr: number[]): number[][] {
    const coords: number[][] = [];
    for (let i = 0; i < x_arr.length; i++) {
        coords.push([x_arr[i], y_arr[i], -z_arr[i]]);
    }

    return coords;
}
