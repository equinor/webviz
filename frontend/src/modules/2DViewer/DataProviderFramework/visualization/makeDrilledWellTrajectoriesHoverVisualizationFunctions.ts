import { ScatterplotLayer } from "@deck.gl/layers";
import { WellsLayer } from "@webviz/subsurface-viewer/dist/layers";
// import { sortedIndex } from "lodash";

import type { WellboreTrajectory_api } from "@api";
import { HoverTopic } from "@framework/HoverService";
// import { BiconeLayer } from "@modules/3DViewer/customDeckGlLayers/BiconeLayer";
// import type { GeoWellFeature } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeDrilledWellTrajectoriesLayer";
import type {
    HoverVisualizationFunctions,
    TransformerArgs,
    VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { getInterpolatedPositionAtMd, wellTrajectoryToGeojson } from "@modules/_shared/utils/wellbore";

export function makeDrilledWellTrajectoriesHoverVisualizationFunctions(
    args: TransformerArgs<any, WellboreTrajectory_api[], any>,
): HoverVisualizationFunctions<VisualizationTarget.DECK_GL> {
    const { id, getData } = args;

    const wellboreTrajectories = getData();

    if (!wellboreTrajectories) {
        return {};
    }

    return {
        [HoverTopic.WELLBORE_MD]: (wellboreMd) => {
            console.log("here");

            if (!wellboreMd) return [];

            const wellboreTrajectory = wellboreTrajectories.find(
                (wellTrajectory) => wellTrajectory.wellboreUuid === wellboreMd.wellboreUuid,
            );

            const visible = wellboreMd !== null && wellboreTrajectory !== undefined;

            if (!visible) return [];

            return [
                new WellsLayer({
                    id: `${id}-hovered-well`,
                    data: {
                        type: "FeatureCollection",
                        features: [wellTrajectoryToGeojson(wellboreTrajectory)],
                    },
                    refine: false,
                    lineStyle: { width: 5, color: [255, 0, 0] },
                    wellHeadStyle: {
                        size: 0,
                    },
                    pickable: false,
                    wellNameVisible: false,
                    ZIncreasingDownwards: true,
                    visible: visible,
                    depthTest: false,
                }),
                new ScatterplotLayer({
                    id: `${id}-hovered-md-point`,
                    data: [getInterpolatedPositionAtMd(wellboreMd.md, wellboreTrajectory)],
                    getFillColor: [255, 0, 0],
                    radiusMinPixels: 20,
                    // getPosition: (d) => d,
                }),
                // new BiconeLayer({
                //     id: `${id}-hovered-md-point`,
                //     centerPoint: hoveredMdPoint3d,
                //     radius: 20,
                //     height: 10,
                //     normalVector: normal,
                //     numberOfSegments: 32,
                //     color: [255, 0, 0],
                //     opacity: 1,
                //     visible: visible,
                //     sizeUnits: "pixels",
                //     minSizeInMeters: 0,
                //     maxSizeInMeters: 200,
                //     depthTest: false,
                // }),
            ];

            // if (visible) {
            //     for (const [index, point] of wellboreTrajectory.mdArr.entries()) {
            //         if (point >= wellboreMd.md) {
            //             // Interpolate the coordinates
            //             const prevPoint = wellboreTrajectory.mdArr[index - 1];
            //             const thisPoint = wellboreTrajectory.mdArr[index];

            //             const prevX = wellboreTrajectory.eastingArr[index - 1];
            //             const prevY = wellboreTrajectory.northingArr[index - 1];
            //             const prevZ = wellboreTrajectory.tvdMslArr[index - 1];
            //             const thisX = wellboreTrajectory.eastingArr[index];
            //             const thisY = wellboreTrajectory.northingArr[index];
            //             const thisZ = wellboreTrajectory.tvdMslArr[index];

            //             const ratio = (wellboreMd.md - prevPoint) / (thisPoint - prevPoint);
            //             const x = prevX + ratio * (thisX - prevX);
            //             const y = prevY + ratio * (thisY - prevY);
            //             const z = prevZ + ratio * (thisZ - prevZ);
            //             hoveredMdPoint3d = [x, y, -z];

            //             const dx = thisX - prevX;
            //             const dy = thisY - prevY;
            //             const dz = thisZ - prevZ;

            //             const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

            //             normal = length === 0 ? [0, 0, 1] : [dx / length, dy / length, -dz / length];

            //             break;
            //         }
            //     }

            //     wellLayerDataFeatures.push(wellTrajectoryToGeojson(wellboreTrajectory));
            // }
        },
    };
}
