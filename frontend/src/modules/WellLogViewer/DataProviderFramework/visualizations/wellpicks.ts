import type { WellborePick_api } from "@api";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import {
    type DataProviderVisualization,
    type TransformerArgs,
    type VisualizationGroup,
    VisualizationItemType,
    type VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type { WellPickSettingTypes } from "../dataProviders/wellpicks/WellPicksProvider";
import { CustomDataProviderType } from "../dataProviderTypes";

type WellpickTransformerArgs = TransformerArgs<WellPickSettingTypes, WellborePick_api[]>;

export type WellPickDataCollection = {
    picks: WellborePick_api[];
    // We currently don't use these fields anywhere, but I'm leaving them here so they're available in the future
    stratColumn: string;
    interpreter: string;
};

export function makeWellPickCollections(args: WellpickTransformerArgs): WellPickDataCollection | null {
    const data = args.getData();
    const stratColumn = args.getSetting(Setting.STRAT_COLUMN);
    const interpreter = args.getSetting(Setting.SMDA_INTERPRETER);

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
