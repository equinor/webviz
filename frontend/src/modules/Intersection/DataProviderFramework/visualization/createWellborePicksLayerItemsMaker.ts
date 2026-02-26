import { getPicksData, transformFormationData } from "@equinor/esv-intersection";

import { LayerType } from "@modules/_shared/components/EsvIntersection";
import type {
    EsvLayerItemsMaker,
    TransformerArgs,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type { EnsembleWellborePicksData } from "../customDataProviderImplementations/EnsembleWellborePicksProvider";

export function createWellborePicksLayerItemsMaker({
    id,
    name,
    isLoading,
    state,
}: TransformerArgs<EnsembleWellborePicksData, never>): EsvLayerItemsMaker | null {
    const selectedWellborePicks = state?.snapshot?.data;
    if (!selectedWellborePicks || isLoading) {
        return null;
    }

    // Convert Picks from api to esv-intersection format
    // Picks can be transformed into unit and non-unit picks, we are placing all in non-unit picks for now
    const emptyUnitList: any[] = [];
    // WellborePick_api.confidence is optional (undefined | null | string), but ESV Pick requires null | string
    const picksForTransform = selectedWellborePicks.map((p) => ({ ...p, confidence: p.confidence ?? null }));
    const pickData = transformFormationData(picksForTransform, emptyUnitList);

    const wellborePicksLayerItemsMaker: EsvLayerItemsMaker = {
        makeLayerItems: (intersectionReferenceSystem) => {
            return [
                {
                    id: `${id}-wellbore-picks-layer`,
                    name,
                    type: LayerType.CALLOUT_CANVAS,
                    hoverable: false,
                    options: {
                        data: getPicksData(pickData),
                        referenceSystem: intersectionReferenceSystem ?? undefined,
                    },
                },
            ];
        },
    };

    return wellborePicksLayerItemsMaker;
}
