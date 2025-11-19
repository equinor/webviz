import { WellsLayer } from "@webviz/subsurface-viewer/dist/layers";

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
            const wellLayerDataFeatures: GeoWellFeature[] = [];

            const wellboreTrajectory = wellboreTrajectories.find(
                (wellTrajectory) => wellTrajectory.wellboreUuid === wellboreUuid,
            );

            if (wellboreTrajectory) {
                wellLayerDataFeatures.push(wellTrajectoryToGeojson(wellboreTrajectory));
            }

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
                    autoHighlight: false,
                    wellNameVisible: false,
                    ZIncreasingDownwards: true,
                    visible: wellLayerDataFeatures.length > 0,
                    depthTest: false,
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
                    opacity: 1,
                    visible: visible,
                    autoHighlight: false,
                    pickable: false,
                    sizeUnits: "pixels",
                    minSizeInMeters: 0,
                    maxSizeInMeters: 200,
                    depthTest: false,
                }),
            ];
        },
    };
}
