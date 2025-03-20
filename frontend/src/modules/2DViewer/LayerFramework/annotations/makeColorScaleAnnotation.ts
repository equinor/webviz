import { Setting } from "@modules/_shared/LayerFramework/settings/settingsDefinitions";
import type {
    Annotation,
    MakeAnnotationsFunctionArgs,
} from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";
import { ColorScaleWithName } from "@modules/_shared/utils/ColorScaleWithName";

export function makeColorScaleAnnotation({
    getSetting,
    id,
    name,
}: MakeAnnotationsFunctionArgs<[Setting.COLOR_SCALE], any>): Annotation[] {
    const colorScale = getSetting(Setting.COLOR_SCALE)?.colorScale;

    if (!colorScale) {
        return [];
    }

    return [{ id, colorScale: ColorScaleWithName.fromColorScale(colorScale, name) }];
}
