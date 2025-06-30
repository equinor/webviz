import type { WellPickProps } from "@webviz/well-log-viewer/dist/components/WellLogView";

import type { WellborePick_api } from "@api";
import {
    type DataProviderVisualization,
    type TransformerArgs,
    type VisualizationGroup,
    VisualizationItemType,
    type VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { createLogViewerWellPicks } from "@modules/WellLogViewer/utils/queryDataTransform";

import { WellborePicksProvider, type WellPickSettingTypes } from "../dataProviders/wellpicks/WellPicksProvider";

type WellpickTransformerArgs = TransformerArgs<WellPickSettingTypes, WellborePick_api[]>;

export function makeLogViewerWellPicks(args: WellpickTransformerArgs): WellPickProps | null {
    const data = args.getData();

    if (!data) return null;

    return createLogViewerWellPicks(data);
}

export type WellPickVisualization = DataProviderVisualization<VisualizationTarget.WSC_WELL_LOG, WellPickProps>;

export function isWellPickVisualization(
    item: VisualizationGroup<any, any, any, any> | DataProviderVisualization<any, any>,
): item is WellPickVisualization {
    return (
        item.itemType === VisualizationItemType.DATA_PROVIDER_VISUALIZATION && item.type === WellborePicksProvider.name
    );
}
