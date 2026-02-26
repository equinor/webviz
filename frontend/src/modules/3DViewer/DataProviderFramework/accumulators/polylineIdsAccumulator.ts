import type {
    IntersectionRealizationGridData,
    IntersectionRealizationGridProviderMeta,
} from "@modules/_shared/DataProviderFramework/dataProviders/implementations/IntersectionRealizationGridProvider";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

export type AccumulatedData = {
    polylineIds: string[];
};

export function accumulatePolylineIds(
    accumulatedData: AccumulatedData,
    { state }: TransformerArgs<IntersectionRealizationGridData, IntersectionRealizationGridProviderMeta>,
): AccumulatedData {
    const customPolylineId = state?.snapshot?.meta.customPolylineId;

    if (!customPolylineId) {
        return accumulatedData;
    }

    const polylineIdsSet = new Set(accumulatedData.polylineIds);
    polylineIdsSet.add(customPolylineId);

    return {
        ...accumulatedData,
        polylineIds: Array.from(polylineIdsSet),
    };
}
