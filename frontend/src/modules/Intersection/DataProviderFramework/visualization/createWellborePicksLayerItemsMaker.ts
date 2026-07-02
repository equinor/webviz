import { getPicksData, transformFormationData } from "@equinor/esv-intersection";

import { CalloutCanvasLayer } from "@modules/_shared/components/EsvIntersection";
import type {
    EsvLayerItemsMaker,
    TransformerArgs,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type { EnsembleWellborePicksSettings } from "../customDataProviderImplementations/EnsembleWellborePicksProvider";

export function createWellborePicksLayerItemsMaker({
    id,
    name,
    isLoading,
    getData,
}: TransformerArgs<EnsembleWellborePicksSettings, any, any, any>): EsvLayerItemsMaker | null {
    const selectedWellborePicks = getData();
    if (!selectedWellborePicks || isLoading) {
        return null;
    }

    // Convert Picks from api to esv-intersection format
    // Picks can be transformed into unit and non-unit picks, we are placing all in non-unit picks for now
    const emptyUnitList: any[] = [];
    const pickData = transformFormationData(selectedWellborePicks, emptyUnitList);

    const wellborePicksLayerItemsMaker: EsvLayerItemsMaker = {
        makeLayerItems: (intersectionReferenceSystem) => {
            return [
                new CalloutCanvasLayer(
                    `${id}-wellbore-picks-layer`,
                    {
                        data: getPicksData(pickData),
                        referenceSystem: intersectionReferenceSystem ?? undefined,
                    },
                    { name },
                ),
            ];
        },
    };

    return wellborePicksLayerItemsMaker;
}
