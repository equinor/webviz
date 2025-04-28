import { getPicksData, transformFormationData } from "@equinor/esv-intersection";
import type {
    EsvLayerItemsMaker,
    TransformerArgs,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { LayerType } from "@modules/_shared/components/EsvIntersection";

import type { EnsembleWellborePicksSettings } from "../customDataProviderImplementations/EnsembleWellborePicksProvider";

export function createWellborePicksLayerItemsMaker({
    id,
    name,
    getData,
}: TransformerArgs<EnsembleWellborePicksSettings, any, any, any>): EsvLayerItemsMaker | null {
    const selectedWellborePicks = getData();
    if (!selectedWellborePicks) {
        return null;
    }

    // Convert Picks from api to esv-intersection format
    // Picks can be transformed into unit and non-unit picks, we are placing all in non-unit picks for now
    const emptyUnitList: any[] = [];
    const pickData = transformFormationData(selectedWellborePicks, emptyUnitList);

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
