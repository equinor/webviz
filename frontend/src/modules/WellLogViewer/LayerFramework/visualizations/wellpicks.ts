import type { WellborePick_api } from "@api";
import { createLogViewerWellPicks } from "@modules/WellLogViewer/utils/queryDataTransform";
import type {
    MakeVisualizationFunction,
    VisualizationTarget,
} from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";
import type { WellPickProps } from "@webviz/well-log-viewer/dist/components/WellLogView";

import type { WellPickSettingTypes } from "../dataProviders/wellpicks/WellPicksProvider";

export const makeLogViewerWellPicks: MakeVisualizationFunction<
    WellPickSettingTypes,
    WellborePick_api[],
    VisualizationTarget.WSC_WELL_LOG
> = (args): WellPickProps | null => {
    const data = args.getData();

    if (!data) return null;

    return createLogViewerWellPicks(data);
};
