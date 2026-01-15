import { GeoJsonLayer } from "@deck.gl/layers";

import type { WellboreTrajectory_api } from "@api";
import { HoverTopic } from "@framework/HoverService";
import { BiconeLayer } from "@modules/3DViewer/customDeckGlLayers/BiconeLayer";
import type { GeoWellFeature } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeDrilledWellTrajectoriesLayer";
import type {
    HoverVisualizationFunctions,
    TransformerArgs,
    VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import {
    getInterpolatedNormalAtMd,
    getInterpolatedPositionAtMd,
    getTrajectoryIndexForMd,
    wellTrajectoryToGeojson,
} from "@modules/_shared/utils/wellbore";

function findWellboreTrajectory(uuid: string | null | undefined, trajectories: WellboreTrajectory_api[]) {
    if (!uuid) return undefined;
    return trajectories.find(({ wellboreUuid }) => wellboreUuid === uuid);
}

export function makeDrilledWellTrajectoriesHoverVisualizationFunctions(
    args: TransformerArgs<any, WellboreTrajectory_api[], any>,
): HoverVisualizationFunctions<VisualizationTarget.DECK_GL> {
    const { id, getData } = args;

    const wellboreTrajectories = getData();

    if (!wellboreTrajectories) {
        return {};
    }

    return {
        [HoverTopic.WELLBORE]: (wellboreUuid) => {
            const trajectoryData: GeoWellFeature[] = [];
            const wellboreTrajectory = findWellboreTrajectory(wellboreUuid, wellboreTrajectories);

            if (wellboreTrajectory) {
                trajectoryData.push(wellTrajectoryToGeojson(wellboreTrajectory, { invertZAxis: true }));
            }
            return [
                new GeoJsonLayer({
                    id: `${id}-hovered-well`,
                    data: {
                        type: "FeatureCollection",
                        features: trajectoryData,
                    },
                    getLineWidth: 3,
                    lineWidthMinPixels: 3,
                    lineBillboard: true,
                    getLineColor: [255, 0, 0],

                    pickable: false,
                    visible: trajectoryData.length > 0,
                    autoHighlight: false,
                }),
            ];
        },
        [HoverTopic.WELLBORE_MD]: (hoverData) => {
            const wellboreTrajectory = wellboreTrajectories.find(
                (wellTrajectory) => wellTrajectory.wellboreUuid === hoverData?.wellboreUuid,
            );

            let hoveredMdPoint3d: [number, number, number] = [0, 0, 0];
            let normal: [number, number, number] = [0, 0, 1];

            const visible = hoverData !== null && wellboreTrajectory !== undefined;

            if (visible) {
                const trajectoryIndex = getTrajectoryIndexForMd(hoverData.md, wellboreTrajectory);

                normal = getInterpolatedNormalAtMd(hoverData.md, wellboreTrajectory, trajectoryIndex);
                hoveredMdPoint3d = getInterpolatedPositionAtMd(hoverData.md, wellboreTrajectory, trajectoryIndex);
                hoveredMdPoint3d[2] *= -1; // Invert z-axis
            }

            return [
                new BiconeLayer({
                    id: `${id}-hovered-md-point`,
                    centerPoint: hoveredMdPoint3d,
                    radius: 20,
                    height: 10,
                    normalVector: normal,
                    numberOfSegments: 32,
                    color: [255, 0, 0],
                    opacity: 0.3,
                    visible: visible,
                    autoHighlight: false,
                    pickable: false,
                    sizeUnits: "pixels",
                    minSizeInMeters: 0,
                    maxSizeInMeters: 200,
                }),
            ];
        },
    };
}
