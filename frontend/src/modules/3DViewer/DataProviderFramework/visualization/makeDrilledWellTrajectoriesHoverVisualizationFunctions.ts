import type { WellboreTrajectory_api } from "@api";
import type { GlobalTopicDefinitions } from "@framework/WorkbenchServices";
import { BiconeLayer } from "@modules/3DViewer/customDeckGlLayers/BiconeLayer";
import type { GeoWellFeature } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeDrilledWellTrajectoriesLayer";
import type {
    HoverVisualizationFunctions,
    TransformerArgs,
    VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { wellTrajectoryToGeojson } from "@modules/_shared/utils/wellbore";
import { WellsLayer } from "@webviz/subsurface-viewer/dist/layers";

export function makeDrilledWellTrajectoriesHoverVisualizationFunctions(
    args: TransformerArgs<any, WellboreTrajectory_api[], any>,
): HoverVisualizationFunctions<VisualizationTarget.DECK_GL> {
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

            let hoveredMdPoint3d: [number, number, number] = [0, 0, 0];
            let normal: [number, number, number] = [0, 0, 1];
            const wellLayerDataFeatures: GeoWellFeature[] = [];

            const visible = hoveredMd !== null && wellboreTrajectory !== undefined;

            if (visible) {
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
                    wellNameVisible: false,
                    ZIncreasingDownwards: false,
                    visible: visible,
                    depthTest: false,
                }),
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
                    sizeUnits: "pixels",
                    minSizeInMeters: 0,
                    maxSizeInMeters: 200,
                    depthTest: false,
                }),
            ];
        },
    };
}
