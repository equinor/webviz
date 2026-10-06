import type { Position } from "@deck.gl/core";
import { GeoJsonLayer } from "@deck.gl/layers";
import {
    getAziAndInclForSegment,
    getSegmentIndicesForMd,
    WellMarkersLayer,
} from "@webviz/subsurface-viewer/dist/layers";

import type { WellboreTrajectory_api } from "@api";
import { HoverTopic } from "@framework/HoverService";
import type {
    HoverVisualizationFunctions,
    TransformerArgs,
    VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type { ExtendedWellFeature } from "@modules/_shared/types/geojson";
import { wellTrajectoryToGeojson } from "@modules/_shared/utils/wellbore";

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
            if (!wellboreTrajectory || !hoverData) return [];

            const data = getMarkerDataAtMd(wellboreTrajectory, hoverData.md);

            return [
                new WellMarkersLayer({
                    id: `${id}-hovered-md-point`,
                    name: "Well Markers",
                    // ! Layer prepares the markers on init; if the data list starts empty, no markers will be shown
                    data: ["dummy"],
                    shape: "circle",
                    sizeUnits: "meters",

                    getSize: 9,
                    getColor: [255, 0, 0, 115],
                    getPosition: data.position,
                    getAzimuth: data.azimuth,
                    getInclination: data.inclination,

                    ZIncreasingDownwards: false,
                }),
            ];
        },
    };
}

function getMarkerDataAtMd(trajectory: WellboreTrajectory_api, md: number) {
    const [startIdx, endIdx] = getSegmentIndicesForMd(trajectory.mdArr, md);

    const mdStart = trajectory.mdArr[startIdx];
    const mdEnd = trajectory.mdArr[endIdx];
    const lengthAlongSegment = (md - mdStart) / (mdEnd - mdStart);

    const segStartPoint: Position = [
        trajectory.eastingArr[startIdx],
        trajectory.northingArr[startIdx],
        // ! The azi/incl interpolator needs z decreasing downwards
        -trajectory.tvdMslArr[startIdx],
    ];
    const segEndPoint: Position = [
        trajectory.eastingArr[endIdx],
        trajectory.northingArr[endIdx],
        // ! The azi/incl interpolator needs z decreasing downwards
        -trajectory.tvdMslArr[endIdx],
    ];

    // Interpolate values
    const { azimuth, inclination } = getAziAndInclForSegment(segStartPoint as any, segEndPoint as any);
    const position: Position = [
        segStartPoint[0] + (segEndPoint[0] - segStartPoint[0]) * lengthAlongSegment,
        segStartPoint[1] + (segEndPoint[1] - segStartPoint[1]) * lengthAlongSegment,
        segStartPoint[2] + (segEndPoint[2] - segStartPoint[2]) * lengthAlongSegment,
    ];

    return { position, azimuth, inclination };
}
