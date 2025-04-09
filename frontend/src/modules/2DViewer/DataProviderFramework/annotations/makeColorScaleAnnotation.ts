import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type {
    Annotation,
    TransformerArgs,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { ColorScaleWithName } from "@modules/_shared/utils/ColorScaleWithName";

export function makeColorScaleAnnotation({
    getSetting,
    id,
    name,
}: TransformerArgs<[Setting.COLOR_SCALE], any>): Annotation[] {
    const colorScale = getSetting(Setting.COLOR_SCALE)?.colorScale;

    if (!colorScale) {
        return [];
    }

    return [{ id, colorScale: ColorScaleWithName.fromColorScale(colorScale, name) }];
}
