import type { WellborePick_api } from "@api";
import { createLogViewerWellPicks } from "@modules/WellLogViewer/utils/queryDataTransform";
import type {
    VisualizationTarget,
    VisualizationTransformer,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type { WellPickProps } from "@webviz/well-log-viewer/dist/components/WellLogView";

import type { WellPickSettingTypes } from "../dataProviders/wellpicks/WellPicksProvider";

export const makeLogViewerWellPicks: VisualizationTransformer<
    WellPickSettingTypes,
    WellborePick_api[],
    VisualizationTarget.WSC_WELL_LOG
> = (args): WellPickProps | null => {
    const data = args.getData();

    if (!data) return null;

    return createLogViewerWellPicks(data);
};
