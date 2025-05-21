import type { IntersectionRealizationGridSettings } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/IntersectionRealizationGridProvider";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type { PolylineIntersection_trans } from "@modules/_shared/utils/wellbore";

export type AccumulatedData = {
    polylineIds: string[];
};

export function accumulatePolylineIds(
    accumulatedData: AccumulatedData,
    { getSetting }: TransformerArgs<IntersectionRealizationGridSettings, PolylineIntersection_trans>,
): AccumulatedData {
    const intersection = getSetting(Setting.INTERSECTION);

    if (!intersection) {
        return accumulatedData;
    }

    if (intersection.type !== "polyline") {
        return accumulatedData;
    }

    const polylineIdsSet = new Set(accumulatedData.polylineIds);
    polylineIdsSet.add(intersection.uuid);

    return {
        ...accumulatedData,
        polylineIds: Array.from(polylineIdsSet),
    };
}
