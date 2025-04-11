import type { WellboreLogCurveData_api } from "@api";
import type { TemplatePlot } from "@modules/WellLogViewer/types";
import { isNumericalDataPoints } from "@modules/WellLogViewer/utils/queryDataTransform";
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
import { makeColorMapFunctionFromColorScale } from "@modules/_shared/DataProviderFramework/visualization/utils/colors";
import type { ColorMapFunction } from "@webviz/well-log-viewer/dist/components/ColorMapFunction";

import _ from "lodash";

import { AreaPlotProvider, type AreaPlotSettingTypes } from "../dataProviders/plots/AreaPlotProvider";
import { DifferentialPlotProvider } from "../dataProviders/plots/DiffPlotProvider";
import { LinearPlotProvider, type LinearPlotSettingTypes } from "../dataProviders/plots/LinearPlotProvider";
import { StackedPlotProvider } from "../dataProviders/plots/StackedPlotProvider";

export const DATA_ACC_KEY = "LOG_CURVE_DATA";
export const DUPLICATE_NAMES_ACC_KEY = "DUPLICATE_CURVE_NAMES";
export const COLOR_MAP_ACC_KEY = "COLOR_MAP_FUNCTIONS";

export type FactoryAccResult = {
    [DATA_ACC_KEY]: WellboreLogCurveData_api[];
    [DUPLICATE_NAMES_ACC_KEY]: Set<string>;
    [COLOR_MAP_ACC_KEY]: ColorMapFunction[];
};

type PlotVisualizationArgs<PlotSettings extends Settings> = TransformerArgs<PlotSettings, WellboreLogCurveData_api>;

function colorFuncName(args: PlotVisualizationArgs<any>): string {
    return `colorMapping::${args.id}`;
}

function getCommonConfig(args: PlotVisualizationArgs<AreaPlotSettingTypes>): TemplatePlot {
    const data = args.getData()!;
    const color = args.getSetting(Setting.COLOR)!;

    return {
        name: data.name,
        logName: data.logName,
        color,
        // TODO: main curve color
    };
}

export function makeAreaPlotConfig(args: PlotVisualizationArgs<AreaPlotSettingTypes>): TemplatePlot | null {
    if (!args.getData()) return null;

    const plotVariant = args.getSetting(Setting.PLOT_VARIANT);
    const commonConfig = getCommonConfig(args);

    const colorFillOptions: Partial<TemplatePlot> = {};

    if (plotVariant === "gradientfill") {
        colorFillOptions.colorMapFunctionName = colorFuncName(args);
    }

    return {
        ...commonConfig,
        ...colorFillOptions,
        type: plotVariant ?? undefined,
        // TODO: Fill/Func
    };
}

export function makeLinePlotConfig(args: PlotVisualizationArgs<LinearPlotSettingTypes>): TemplatePlot | null {
    if (!args.getData()) return null;

    const plotVariant = args.getSetting(Setting.PLOT_VARIANT) ?? undefined;
    const commonConfig = getCommonConfig(args);

    return {
        ...commonConfig,
        type: plotVariant,
    };
}

export const plotDataAccumulator: ReduceAccumulatedDataFunction<Setting[], WellboreLogCurveData_api, FactoryAccResult> =
    function plotDataAccumulator(acc, args) {
        const newData = args.getData();
        if (!newData) return acc;

        const duplicatedNames = _.get(acc, DUPLICATE_NAMES_ACC_KEY) ?? new Set();
        const curveData = _.get(acc, DATA_ACC_KEY) ?? [];
        const colorMapFuncDefs = _.get(acc, COLOR_MAP_ACC_KEY) ?? [];

        const existingCurve = _.find(curveData, ["name", newData.name]);
        const sameName = existingCurve?.name === newData.name;
        const sameLog = existingCurve?.logName === newData.logName;

        if (args.getSetting(Setting.PLOT_VARIANT) === "gradientfill") {
            const colorScale = args.getSetting(Setting.COLOR_SCALE)?.colorScale;
            const dataPoints = newData.dataPoints;

            if (!isNumericalDataPoints(dataPoints)) {
                console.warn("Cannot create color mapping for non-numeric data");
            }

            if (colorScale && isNumericalDataPoints(dataPoints)) {
                const minValue = newData.minCurveValue ?? _.minBy(dataPoints, "1")![1];
                const maxValue = newData.maxCurveValue ?? _.maxBy(dataPoints, "1")![1];

                colorMapFuncDefs.push({
                    name: colorFuncName(args),
                    func: makeColorMapFunctionFromColorScale(colorScale, minValue, maxValue)!,
                });
            }
        }

        if (sameName && sameLog) return acc;
        if (sameName) duplicatedNames.add(newData.name);

        return {
            ...acc,
            [DATA_ACC_KEY]: [...curveData, newData],
            [COLOR_MAP_ACC_KEY]: colorMapFuncDefs,
            [DUPLICATE_NAMES_ACC_KEY]: duplicatedNames,
        };
    };

export type PlotVisualization = DataProviderVisualization<VisualizationTarget.WSC_WELL_LOG, TemplatePlot>;

export function isPlotVisualization(
    item: VisualizationGroup<any, any, any, any> | DataProviderVisualization<any, any>,
): item is PlotVisualization {
    if (item.itemType !== VisualizationItemType.DATA_PROVIDER_VISUALIZATION) return false;

    return [
        AreaPlotProvider.name,
        LinearPlotProvider.name,
        DifferentialPlotProvider.name,
        StackedPlotProvider.name,
    ].includes(item.type);
}
