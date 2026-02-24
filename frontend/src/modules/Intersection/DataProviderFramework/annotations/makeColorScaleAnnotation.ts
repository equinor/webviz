import type { ColorScaleSpecification } from "@framework/components/ColorScaleSelector/colorScaleSelector";
import type { DataProviderMeta } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type {
    Annotation,
    TransformerArgs,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { ColorScaleWithName } from "@modules/_shared/utils/ColorScaleWithName";

import { createGridColorScaleValues, createSeismicColorScaleValues } from "../utils/colorScaleUtils";

type ColorScaleMeta = DataProviderMeta & {
    colorScale: ColorScaleSpecification;
};

function makeColorScaleAnnotation<TData, TMeta extends ColorScaleMeta>({
    id,
    isLoading,
    state,
    createColorScaleValues,
}: TransformerArgs<TData, TMeta> & {
    createColorScaleValues: (valueRange: readonly [number, number]) => { min: number; max: number; mid: number };
}): Annotation[] {
    const snapshot = state?.snapshot;
    if (!snapshot) {
        return [];
    }

    const colorScale = snapshot.meta?.colorScale?.colorScale;
    const useCustomColorScaleBoundaries = snapshot.meta?.colorScale?.areBoundariesUserDefined ?? false;
    const valueRange = snapshot.valueRange;
    const attribute = snapshot.dataLabel;

    if (!colorScale || !valueRange || !attribute || isLoading) {
        return [];
    }

    // Adjust color scale boundaries
    const adjustedColorScale = colorScale.clone();
    if (!useCustomColorScaleBoundaries) {
        const { min, max, mid } = createColorScaleValues(valueRange);
        adjustedColorScale.setRangeAndMidPoint(min, max, mid);
    }

    return [{ id, colorScale: ColorScaleWithName.fromColorScale(adjustedColorScale, attribute) }];
}

export function makeGridColorScaleAnnotation<TData, TMeta extends ColorScaleMeta>(
    args: TransformerArgs<TData, TMeta>,
): Annotation[] {
    return makeColorScaleAnnotation({
        ...args,
        createColorScaleValues: createGridColorScaleValues,
    });
}

export function makeSeismicColorScaleAnnotation<TData, TMeta extends ColorScaleMeta>(
    args: TransformerArgs<TData, TMeta>,
): Annotation[] {
    return makeColorScaleAnnotation({
        ...args,
        createColorScaleValues: createSeismicColorScaleValues,
    });
}
