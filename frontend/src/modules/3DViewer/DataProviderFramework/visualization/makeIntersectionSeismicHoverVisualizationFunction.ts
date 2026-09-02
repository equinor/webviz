import type { Color, Position } from "@deck.gl/core";
import type { ColumnLayerProps } from "@deck.gl/layers";
import { ColumnLayer } from "@deck.gl/layers";
import { WellMarkersLayer } from "@webviz/subsurface-viewer/dist/layers";
import { chunk } from "lodash-es";

import { HoverTopic } from "@framework/HoverService";
import { IntersectionType } from "@framework/types/intersection";
import type {
    IntersectionSeismicData,
    IntersectionSeismicSettings,
    IntersectionSeismicStoredData,
} from "@modules/_shared/DataProviderFramework/dataProviders/implementations/seismicProviders/IntersectionSeismicProvider";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type {
    HoverVisualizationFunctions,
    TransformerArgs,
    VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { makeFenceSourceId } from "@modules/_shared/utils/fence";
import { positionAtLengthAlong } from "@modules/_shared/utils/polylineHoverUtils";

const HIGHLIGHT_COLOR = [255, 0, 0] as Color;
const FENCE_HIGHLIGHT_LAYER_PROPS: Partial<ColumnLayerProps> = {
    diskResolution: 20,
    radiusUnits: "pixels",
    flatShading: true,
    elevationScale: 1,
    extruded: true,
    getFillColor: HIGHLIGHT_COLOR,
    pickable: false,
    autoHighlight: false,
};

export function makeIntersectionSeismicHoverVisualizationFunction(
    args: TransformerArgs<IntersectionSeismicSettings, IntersectionSeismicData, IntersectionSeismicStoredData>,
): HoverVisualizationFunctions<VisualizationTarget.DECK_GL> {
    const { id, getData, getSetting, getStoredData } = args;
    const seismicIntersection = getData();
    const intersectionSetting = getSetting(Setting.INTERSECTION);
    const fenceData = getData();
    const sourcePolylineWithSectionLengths = getStoredData("sourcePolylineWithSectionLengths");

    return {
        [HoverTopic.FENCE]: (hoverInfo) => {
            if (!seismicIntersection) return [];
            if (!fenceData) return [];
            if (!hoverInfo) return [];
            if (!intersectionSetting) return [];
            if (!sourcePolylineWithSectionLengths) return [];
            if (hoverInfo.fenceId !== makeFenceSourceId(intersectionSetting)) return [];

            // For well-bores, the path-along get's offset by the extension length
            let lengthAlong = hoverInfo.lengthAlong;
            if (intersectionSetting.type === IntersectionType.WELLBORE) {
                lengthAlong += intersectionSetting.extensionLength;
            }

            const fenceDepthPos = hoverInfo.depth ?? 0;
            const hoverPos = positionAtLengthAlong(
                chunk(sourcePolylineWithSectionLengths.polylineUtmXy, 2),
                lengthAlong,
            );

            // This case should never fire, as a valid hover payload implies the position exists
            if (!hoverPos) {
                throw new Error("Expected valid path position for hover length along polyline");
            }

            const data: Position = [hoverPos[0], hoverPos[1], -fenceDepthPos];

            const depthMarkerVisible =
                hoverInfo.depth !== null &&
                inBounds(hoverInfo.depth, fenceData.min_fence_depth, fenceData.max_fence_depth);

            return [
                // Making use of this subsurface layer, as it gives a nice scalable disc with a slight thickness
                new WellMarkersLayer({
                    name: "markers",
                    id: `${id}-hovered-fence-column-depth`,
                    // Using a "dummy" object for data stability, all properties are computed
                    data: ["DUMMY"],
                    getPosition: () => data,
                    getSize: 6,
                    getAzimuth: 90,
                    getInclination: 0,
                    shape: "circle",
                    sizeUnits: "pixels",
                    ZIncreasingDownwards: false,
                    getColor: HIGHLIGHT_COLOR,
                    // The outline adds a little extra thickness. This makes the marker easier to see when viewing it head on
                    getOutlineColor: HIGHLIGHT_COLOR,
                    visible: depthMarkerVisible,
                }),

                new ColumnLayer({
                    ...FENCE_HIGHLIGHT_LAYER_PROPS,
                    id: `${id}-hovered-fence-pos-along`,
                    // Using a "dummy" object for data stability, all properties are computed
                    data: ["DUMMY"],
                    // The column should go along the entire fence, forming a line through it
                    getPosition: () => [hoverPos[0], hoverPos[1], -fenceData.max_fence_depth] as Position,
                    radius: 2,
                    getElevation: Math.abs(fenceData.max_fence_depth - fenceData.min_fence_depth),
                    material: { ambient: 0.5 },
                }),
            ];
        },
    };
}

/** Similar to lodash's inRange, but with inclusive max  */
function inBounds(n: number, min: number, max: number) {
    return n >= min && n <= max;
}
