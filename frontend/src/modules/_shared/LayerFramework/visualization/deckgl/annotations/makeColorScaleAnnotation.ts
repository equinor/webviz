import { Setting } from "@modules/_shared/LayerFramework/settings/settingsDefinitions";
import type {
    Annotation,
    FactoryFunctionArgs,
} from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";
import { ColorScaleWithName } from "@modules/_shared/utils/ColorScaleWithName";

export function makeColorScaleAnnotation({
    getSetting,
    id,
    name,
    getValueRange,
}: FactoryFunctionArgs<[Setting.COLOR_SCALE], any>): Annotation[] {
    const colorScale = getSetting(Setting.COLOR_SCALE)?.colorScale;

    if (!colorScale) {
        return [];
    }

    const range = getValueRange();
    if (!range) {
        return [];
    }

    const localColorScale = colorScale.clone();
    localColorScale.setRange(range[0], range[1]);

    return [{ id, colorScale: ColorScaleWithName.fromColorScale(localColorScale, name) }];
}
