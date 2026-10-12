import { GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { GL } from "@luma.gl/webgl/constants";
import type { Point3D } from "@webviz/subsurface-viewer";
import { getSegmentIndicesForMd } from "@webviz/subsurface-viewer/dist/layers";

import type { WellboreTrajectory_api } from "@api";
import { HoverTopic } from "@framework/HoverService";
import type {
    HoverVisualizationFunctions,
    TransformerArgs,
    VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type { ExtendedWellFeature } from "@modules/_shared/types/geojson";
import { interpolateSegmentPosition, wellTrajectoryToGeojson } from "@modules/_shared/utils/wellbore";

function findWellboreTrajectory(uuid: string | null | undefined, trajectories: WellboreTrajectory_api[]) {
    if (!uuid) return undefined;
    return trajectories.find(({ wellboreUuid }) => wellboreUuid === uuid);
}

export function makeWellTrajectoriesHoverVisualizationFunctions(
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
            const wellboreTrajectory = findWellboreTrajectory(hoverData?.wellboreUuid, wellboreTrajectories);

            const mdPointData: Point3D[] = [];

            if (hoverData && wellboreTrajectory) {
                mdPointData.push(getPositionAtMd(wellboreTrajectory, hoverData.md));
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

function getPositionAtMd(trajectory: WellboreTrajectory_api, md: number) {
    const [startIdx, endIdx] = getSegmentIndicesForMd(trajectory.mdArr, md);

    const mdStart = trajectory.mdArr[startIdx];
    const mdEnd = trajectory.mdArr[endIdx];
    const lengthAlongSegment = (md - mdStart) / (mdEnd - mdStart);

    return interpolateSegmentPosition(trajectory, startIdx, endIdx, lengthAlongSegment);
}
