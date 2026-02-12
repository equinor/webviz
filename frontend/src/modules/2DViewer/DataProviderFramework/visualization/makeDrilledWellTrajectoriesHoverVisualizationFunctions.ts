import { GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { GL } from "@luma.gl/constants";
import type { Point3D } from "@webviz/subsurface-viewer";

import type { WellboreTrajectory_api } from "@api";
import { HoverTopic } from "@framework/HoverService";
import type {
    HoverVisualizationFunctions,
    TransformerArgs,
    VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type { ExtendedWellFeature } from "@modules/_shared/types/geojson";
import { getInterpolatedPositionAtMd, wellTrajectoryToGeojson } from "@modules/_shared/utils/wellbore";

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
            const trajectoryData: ExtendedWellFeature[] = [];
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
                    getLineWidth: 5,
                    lineWidthMinPixels: 5,
                    lineBillboard: true,
                    getLineColor: [255, 0, 0],

                    pickable: false,
                    visible: trajectoryData.length > 0,
                    autoHighlight: false,
                    parameters: { [GL.DEPTH_TEST]: false },
                }),
            ];
        },

        [HoverTopic.WELLBORE_MD]: (hoverData) => {
            const mdPointData: Point3D[] = [];
            if (hoverData?.md) {
                const wellboreTrajectory = findWellboreTrajectory(hoverData?.wellboreUuid, wellboreTrajectories);
                if (wellboreTrajectory) {
                    const interpolatedPosition = getInterpolatedPositionAtMd(hoverData.md, wellboreTrajectory);
                    interpolatedPosition[2] *= -1; // TVD value is positive, so we flip of for the actual z-position

                    mdPointData.push(interpolatedPosition);
                }
            }

            return [
                new ScatterplotLayer({
                    id: `${id}-hovered-md-point`,
                    data: mdPointData,
                    getRadius: 2,
                    radiusMinPixels: 8,
                    getLineWidth: 0.1,
                    lineWidthMinPixels: 1,
                    getFillColor: [255, 0, 0, 180],
                    getPosition: (d) => d,

                    stroked: true,
                    depthTest: false,
                    pickable: false,
                    billboard: true,
                    autoHighlight: false,
                    visible: mdPointData.length > 0,
                    parameters: { [GL.DEPTH_TEST]: false },
                }),
            ];
        },
    };
}
