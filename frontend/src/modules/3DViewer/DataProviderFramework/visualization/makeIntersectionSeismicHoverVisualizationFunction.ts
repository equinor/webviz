import type { Color, Position } from "@deck.gl/core";
import type { ColumnLayerProps } from "@deck.gl/layers";
import { LineLayer, ColumnLayer } from "@deck.gl/layers";
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

const HIGHLIGHT_COLOR = [255, 0, 0, 180] as Color;
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

            const data = [];

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

            if (!hoverPos) throw new Error("Expected valid path position for hover length along polyline");

            data.push(hoverPos.toSpliced(-1, 1, -fenceDepthPos));

            return [
                new ColumnLayer({
                    ...FENCE_HIGHLIGHT_LAYER_PROPS,
                    id: `${id}-hovered-fence-column-depth`,
                    data: data,
                    radius: 46,
                    getPosition: (d) => d,
                    getElevation: 1,
                    visible: hoverInfo.depth !== null,
                }),

                new ColumnLayer({
                    ...FENCE_HIGHLIGHT_LAYER_PROPS,
                    id: `${id}-hovered-fence-pos-along`,
                    data: data,
                    radius: 16,

                    // The column should go along the entire fence, forming a line through it
                    getPosition: (d) => d.toSpliced(-1, 1, -fenceData.max_fence_depth) as Position,
                    getElevation: Math.abs(fenceData.max_fence_depth - fenceData.min_fence_depth),
                }),

                // On large zoom levels, the column gets hard to see (there is no "min-radius"). This line layer is
                // obscured by the position column when zoomed in, but as we zoom out, the line layer remains visible
                // thanks to the min-pixels, making it appear as if the column keeps a min-radius
                // ! Note that the ordering matters. By having the line layer last, the column layer hides it fully
                new LineLayer({
                    id: `${id}-hovered-fence-line-along`,
                    data: data,
                    getSourcePosition: (d: number[]) => d.toSpliced(-1, 1, -fenceData.min_fence_depth) as Position,
                    getTargetPosition: (d: number[]) => d.toSpliced(-1, 1, -fenceData.max_fence_depth) as Position,
                    getColor: HIGHLIGHT_COLOR,

                    getWidth: 1,
                    widthMinPixels: 3,
                    widthMaxPixels: 3,

                    billboard: true,
                    pickable: false,
                }),
            ];
        },
    };
}
