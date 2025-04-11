import type { WellboreTrajectory_api } from "@api";
import type { ColorMapFunction } from "@webviz/well-log-viewer/dist/components/ColorMapFunction";
import type { WellLogSet } from "@webviz/well-log-viewer/dist/components/WellLogTypes";
import type { WellPickProps } from "@webviz/well-log-viewer/dist/components/WellLogView";

import _ from "lodash";

import { MAIN_AXIS_CURVE, createWellLogSets } from "./queryDataTransform";
import { getUniqueCurveNameForPlotConfig } from "./strings";
import { trajectoryToIntersectionReference } from "./trajectory";
import type { WellLogFactoryProduct } from "./useLogViewerVisualizationFactory";

import {
    COLOR_MAP_ACC_KEY,
    DATA_ACC_KEY,
    DUPLICATE_NAMES_ACC_KEY,
    isPlotVisualization,
} from "../DataProviderFramework/visualizations/plots";
import type { TrackVisualizationGroup } from "../DataProviderFramework/visualizations/tracks";
import { isTrackGroup } from "../DataProviderFramework/visualizations/tracks";
import { isWellPickVisualization } from "../DataProviderFramework/visualizations/wellpicks";
import type { Template, TemplatePlot, TemplateTrack } from "../types";

export type LogViewerProps = {
    padData: boolean;
    horizontal: boolean;
};

function getProvidedPlots(trackGroup: TrackVisualizationGroup, duplicatedCurveNames: Set<string>) {
    const plots: TemplatePlot[] = [];

    for (const child of trackGroup.children) {
        if (!isPlotVisualization(child)) continue;

        const template = child.visualization;

        plots.push({
            ...template,
            // ! Map each plot to ensure a name that points to the correct curve
            name: getUniqueCurveNameForPlotConfig(template, duplicatedCurveNames),
        });
    }

    return plots;
}

export function createWellLogTemplateFromProduct(factoryProduct: WellLogFactoryProduct | null): Template {
    const tracks: TemplateTrack[] = [];
    const accData = factoryProduct?.accumulatedData;

    const duplicatedCurveNames = _.get(accData, DUPLICATE_NAMES_ACC_KEY);

    for (const child of factoryProduct?.children ?? []) {
        if (!isTrackGroup(child)) continue;

        const templatePlots = getProvidedPlots(child, duplicatedCurveNames!);
        const templateProps = child.customProps;

        tracks.push({
            ...templateProps,
            plots: templatePlots,
        });
    }

    return {
        // AFAIK, this name is not show anywhere
        name: "Well log viewer",
        scale: { primary: MAIN_AXIS_CURVE.name, allowSecondary: true },
        tracks,
    };
}

export function createWellLogJsonFromProduct(
    factoryProduct: WellLogFactoryProduct | null,
    wellboreTrajectory: WellboreTrajectory_api,
    padDataWithEmptyRows?: boolean,
): WellLogSet[] {
    if (!factoryProduct) return [];

    const accData = factoryProduct.accumulatedData;
    const curveData = _.get(accData, DATA_ACC_KEY, []);
    const duplicatedCurveNames = _.get(accData, DUPLICATE_NAMES_ACC_KEY);

    const referenceSystem = trajectoryToIntersectionReference(wellboreTrajectory);

    return createWellLogSets(
        curveData,
        wellboreTrajectory,
        referenceSystem,
        duplicatedCurveNames,
        padDataWithEmptyRows,
    );
}

export function createWellPickPropFromProduct(factoryProduct: WellLogFactoryProduct | null): WellPickProps | undefined {
    if (!factoryProduct) return undefined;

    // ! We only take the
    const wellpickVisualization = factoryProduct.children.find((child) => isWellPickVisualization(child));

    // Can be used as is, no need for further transformations
    return wellpickVisualization?.visualization;
}

export function createColorMapDefsFromProduct(factoryProduct: WellLogFactoryProduct | null): ColorMapFunction[] {
    if (!factoryProduct) return [];

    const accData = factoryProduct.accumulatedData;
    const colorMapFuncDefs = _.get(accData, COLOR_MAP_ACC_KEY) ?? [];

    return colorMapFuncDefs;
}
