import type { WellborePick_api } from "@api";
import {
    type DataProviderVisualization,
    type TransformerArgs,
    type VisualizationGroup,
    VisualizationItemType,
    type VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type { WellPickDataCollection } from "@modules/_shared/types/wellpicks";

import type { WellPicksProviderMeta } from "../dataProviders/wellpicks/WellPicksProvider";
import { CustomDataProviderType } from "../dataProviderTypes";

type WellpickTransformerArgs = TransformerArgs<WellborePick_api[], WellPicksProviderMeta>;

export function makeWellPickCollections(args: WellpickTransformerArgs): WellPickDataCollection | null {
    const snapshot = args.state?.snapshot;
    const data = snapshot?.data;
    const stratColumn = snapshot?.meta.stratColumn;
    const interpreter = snapshot?.meta.interpreter;

    if (!data || !stratColumn || !interpreter) return null;

    return {
        stratColumn,
        interpreter,
        picks: data,
    };
}

export type WellPickVisualization = DataProviderVisualization<VisualizationTarget.WSC_WELL_LOG, WellPickDataCollection>;

export function isWellPickVisualization(
    item: VisualizationGroup<any, any, any, any> | DataProviderVisualization<any, any>,
): item is WellPickVisualization {
    return (
        item.itemType === VisualizationItemType.DATA_PROVIDER_VISUALIZATION &&
        item.type === CustomDataProviderType.WELLBORE_PICKS
    );
}
