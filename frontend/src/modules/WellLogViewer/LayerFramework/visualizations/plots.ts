import type { WellboreLogCurveData_api } from "@api";
import type { Settings } from "@modules/_shared/LayerFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/LayerFramework/settings/settingsDefinitions";
import type {
    MakeVisualizationFunction,
    ReduceAccumulatedDataFunction,
    VisualizationTarget,
} from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";

import _ from "lodash";

import type { AreaPlotSettingTypes } from "../dataProviders/plots/AreaPlotProvider";
import type { LinearPlotSettingTypes } from "../dataProviders/plots/LinearPlotProvider";

export const DATA_ACC_KEY = "LOG_CURVE_DATA";

type PlotVisualizationFunc<PlotSettings extends Settings> = MakeVisualizationFunction<
    PlotSettings,
    WellboreLogCurveData_api,
    VisualizationTarget.WSC_WELL_LOG
>;

export const makeAreaPlotConfig: PlotVisualizationFunc<AreaPlotSettingTypes> = (args) => {
    const data = args.getData();
    const plotVariant = args.getSetting(Setting.PLOT_VARIANT);

    return {
        name: data?.name ?? "",
        type: plotVariant ?? undefined,

        // TODO: Color
        // TODO: Fill/Func
    };
};

export const makeLinePlotConfig: PlotVisualizationFunc<LinearPlotSettingTypes> = (args) => {
    const data = args.getData();

    const plotVariant = args.getSetting(Setting.PLOT_VARIANT) ?? undefined;
    const curveName = data?.name ?? "";

    return {
        name: curveName,
        type: plotVariant,
        // TODO: Color
    };
};

export const plotDataAccumulator: ReduceAccumulatedDataFunction<[], WellboreLogCurveData_api, Record<string, any>> = (
    acc,
    args,
) => {
    const existingData = _.get(acc, DATA_ACC_KEY, []) as WellboreLogCurveData_api[];
    const newData = args.getData();

    // TODO: Use this to set up name-uniqueness checks?

    if (!newData || _.find(existingData, ["name", newData.name])) return acc;

    return {
        ...acc,
        [DATA_ACC_KEY]: [...existingData, newData],
    };
};
