import type { SurfaceProviderMeta } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/surfaceProviders/SeismicSurfaceProvider";
import type { SurfaceData } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/surfaceProviders/types";
import type {
    Annotation,
    TransformerArgs,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { ColorScaleWithName } from "@modules/_shared/utils/ColorScaleWithName";

export function makeSeismicColorScaleAnnotation({
    id,
    name,
    isLoading,
    state,
}: TransformerArgs<SurfaceData, SurfaceProviderMeta>): Annotation[] {
    const snapshot = state?.snapshot;
    if (!snapshot) {
        return [];
    }

    const colorScale = snapshot.meta.colorScale?.colorScale;
    const useCustomColorScaleBoundaries = snapshot.meta.colorScale?.areBoundariesUserDefined ?? false;
    const valueRange = snapshot.valueRange;

    if (!colorScale || !valueRange || isLoading) {
        return [];
    }

    // Adjust color scale boundaries
    const adjustedColorScale = colorScale.clone();
    if (!useCustomColorScaleBoundaries) {
        const [min, max] = valueRange;
        const mid = min + (max - min) / 2;
        adjustedColorScale.setRangeAndMidPoint(min, max, mid);
    }

    return [{ id, colorScale: ColorScaleWithName.fromColorScale(adjustedColorScale, name) }];
}
