import type { WellboreLogCurveData_api } from "@api";
import type { TemplatePlot } from "@modules/WellLogViewer/types";
import type { Settings } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type {
    ReduceAccumulatedDataFunction,
    VisualizationTarget,
    VisualizationTransformer,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import _ from "lodash";

import type { AreaPlotSettingTypes } from "../dataProviders/plots/AreaPlotProvider";
import type { LinearPlotSettingTypes } from "../dataProviders/plots/LinearPlotProvider";

export const DATA_ACC_KEY = "LOG_CURVE_DATA";
export const DUPLICATE_NAMES_ACC_KEY = " DUPLICATE_CURVE_NAMES";

export type FactoryAccResult = {
    [DATA_ACC_KEY]: WellboreLogCurveData_api[];
    [DUPLICATE_NAMES_ACC_KEY]: Set<string>;
};

type PlotVisualizationFunc<PlotSettings extends Settings> = VisualizationTransformer<
    PlotSettings,
    WellboreLogCurveData_api,
    VisualizationTarget.WSC_WELL_LOG
>;

export const makeAreaPlotConfig: PlotVisualizationFunc<AreaPlotSettingTypes> = function makeAreaPlotConfig(
    args,
): TemplatePlot {
    const data = args.getData();
    const plotVariant = args.getSetting(Setting.PLOT_VARIANT);

    const curveName = data?.name ?? "";
    const logName = data?.logName ?? "";

    return {
        logName: logName,
        name: curveName,
        type: plotVariant ?? undefined,

        // TODO: Color
        // TODO: Fill/Func
    };
};

export const makeLinePlotConfig: PlotVisualizationFunc<LinearPlotSettingTypes> = (args) => {
    const data = args.getData();

    const plotVariant = args.getSetting(Setting.PLOT_VARIANT) ?? undefined;
    const curveName = data?.name ?? "";
    const logName = data?.logName ?? "";

    return {
        logName: logName,
        name: curveName,
        type: plotVariant,
        // TODO: Color
    };
};

export const plotDataAccumulator: ReduceAccumulatedDataFunction<[], WellboreLogCurveData_api, FactoryAccResult> =
    function plotDataAccumulator(acc, args) {
        const newData = args.getData();
        if (!newData) return acc;

        const duplicatedNames = _.get(acc, DUPLICATE_NAMES_ACC_KEY, new Set()) as Set<string>;
        const curveData = _.get(acc, DATA_ACC_KEY, []) as WellboreLogCurveData_api[];

        const existingCurve = _.find(curveData, ["name", newData.name]);
        const sameName = existingCurve?.name === newData.name;
        const sameLog = existingCurve?.logName === newData.logName;

        if (sameName && sameLog) return acc;
        if (sameName) duplicatedNames.add(newData.name);

        return {
            ...acc,
            [DATA_ACC_KEY]: [...curveData, newData],
            [DUPLICATE_NAMES_ACC_KEY]: duplicatedNames,
        };
    };
