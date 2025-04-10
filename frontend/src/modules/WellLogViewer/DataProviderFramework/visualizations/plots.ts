import type { WellboreLogCurveData_api } from "@api";
import type { TemplatePlot } from "@modules/WellLogViewer/types";
import type { Settings } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import {
    type DataProviderVisualization,
    type ReduceAccumulatedDataFunction,
    type TransformerArgs,
    type VisualizationGroup,
    VisualizationItemType,
    type VisualizationTarget,
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

type PlotVisualizationArgs<PlotSettings extends Settings> = TransformerArgs<PlotSettings, WellboreLogCurveData_api>;

function getCommonConfig(data: WellboreLogCurveData_api): TemplatePlot {
    return {
        name: data.name,
        logName: data.logName,
        // TODO: main curve color
    };
}

export function makeAreaPlotConfig(args: PlotVisualizationArgs<AreaPlotSettingTypes>): TemplatePlot | null {
    if (!args.getData()) return null;

    const data = args.getData()!;
    const plotVariant = args.getSetting(Setting.PLOT_VARIANT);
    const commonConfig = getCommonConfig(data);

    return {
        ...commonConfig,
        type: plotVariant ?? undefined,
        // TODO: Fill/Func
    };
}

export function makeLinePlotConfig(args: PlotVisualizationArgs<LinearPlotSettingTypes>): TemplatePlot | null {
    if (!args.getData()) return null;

    const data = args.getData()!;
    const plotVariant = args.getSetting(Setting.PLOT_VARIANT) ?? undefined;
    const commonConfig = getCommonConfig(data);

    return {
        ...commonConfig,
        type: plotVariant,
    };
}

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

export type PlotVisualization = DataProviderVisualization<VisualizationTarget.WSC_WELL_LOG, TemplatePlot>;

export function isPlotVisualization(
    item: VisualizationGroup<any, any, any, any> | DataProviderVisualization<any, any>,
): item is PlotVisualization {
    if (item.itemType !== VisualizationItemType.DATA_PROVIDER_VISUALIZATION) return false;

    // TODO: Check item.providerType once that's implemented
    return "logName" in item.visualization;
}
