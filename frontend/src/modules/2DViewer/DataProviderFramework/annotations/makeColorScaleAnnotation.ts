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
<<<<<<<< HEAD:frontend/src/modules/_shared/DataProviderFramework/visualization/deckgl/annotations/makeColorScaleAnnotation.ts
    getValueRange,
}: FactoryFunctionArgs<[Setting.COLOR_SCALE], any>): Annotation[] {
========
}: TransformerArgs<[Setting.COLOR_SCALE], any>): Annotation[] {
>>>>>>>> origin/dpf-improve-dep-tree:frontend/src/modules/2DViewer/DataProviderFramework/annotations/makeColorScaleAnnotation.ts
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
