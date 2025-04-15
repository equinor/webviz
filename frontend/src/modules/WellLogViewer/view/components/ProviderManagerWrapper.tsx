import React from "react";

import type { WellboreTrajectory_api } from "@api";
import type { DiffVisualizationGroup } from "@modules/WellLogViewer/DataProviderFramework/visualizations/plots";
import {
    COLOR_MAP_ACC_KEY,
    DATA_ACC_KEY,
    DUPLICATE_NAMES_ACC_KEY,
    isDiffPlotGroup,
    isPlotVisualization,
} from "@modules/WellLogViewer/DataProviderFramework/visualizations/plots";
import {
    type TrackVisualizationGroup,
    isTrackGroup,
} from "@modules/WellLogViewer/DataProviderFramework/visualizations/tracks";
import { isWellPickVisualization } from "@modules/WellLogViewer/DataProviderFramework/visualizations/wellpicks";
import { MAIN_AXIS_CURVE } from "@modules/WellLogViewer/constants";
import type { Template, TemplatePlot, TemplateTrack } from "@modules/WellLogViewer/types";
import { createWellLogSets } from "@modules/WellLogViewer/utils/queryDataTransform";
import { getUniqueCurveNameForPlotConfig } from "@modules/WellLogViewer/utils/strings";
import { trajectoryToIntersectionReference } from "@modules/WellLogViewer/utils/trajectory";
import type { WellLogFactoryProduct } from "@modules/WellLogViewer/utils/useLogViewerVisualizationProduct";
import { useLogViewerVisualizationProduct } from "@modules/WellLogViewer/utils/useLogViewerVisualizationProduct";
import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { CircularProgress } from "@mui/material";
import type { ColorMapFunction } from "@webviz/well-log-viewer/dist/components/ColorMapFunction";
import type { WellLogSet } from "@webviz/well-log-viewer/dist/components/WellLogTypes";
import type { WellPickProps } from "@webviz/well-log-viewer/dist/components/WellLogView";

import _ from "lodash";

import type { SubsurfaceLogViewerWrapperProps } from "./SubsurfaceLogViewerWrapper";
import { SubsurfaceLogViewerWrapper } from "./SubsurfaceLogViewerWrapper";

export type LogViewerProps = {
    padData: boolean;
    horizontal: boolean;
};

function getProvidedPlots(
    trackGroup: TrackVisualizationGroup | DiffVisualizationGroup,
    duplicatedCurveNames: Set<string>,
) {
    const plots: TemplatePlot[] = [];

    for (const child of trackGroup.children) {
        if (isPlotVisualization(child)) {
            const template = child.visualization;

            plots.push({
                ...template,
                // ! Map each plot to ensure a name that points to the correct curve
                name: getUniqueCurveNameForPlotConfig(template, duplicatedCurveNames),
            });
        } else if (isDiffPlotGroup(child)) {
            // ! Recursively get this group's children
            const [primaryPlot, secondaryPlot] = getProvidedPlots(child, duplicatedCurveNames);

            if (primaryPlot && secondaryPlot) {
                plots.push({
                    ...primaryPlot,
                    name: getUniqueCurveNameForPlotConfig(primaryPlot, duplicatedCurveNames),
                    name2: getUniqueCurveNameForPlotConfig(secondaryPlot, duplicatedCurveNames),
                    logName2: secondaryPlot.logName,
                    color2: secondaryPlot.color,

                    // Over/under colors
                    // TODO: Make this based on a setting
                    fill: "#c50f0f",
                    fill2: "#0d8d1e",
                });
            }
        }
    }

    return plots;
}

function createWellLogTemplateFromProduct(factoryProduct: WellLogFactoryProduct | null): Template {
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

function createWellLogJsonFromProduct(
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

function createWellPickPropFromProduct(factoryProduct: WellLogFactoryProduct | null): WellPickProps | undefined {
    if (!factoryProduct) return undefined;

    // ! We only take the
    const wellpickVisualization = factoryProduct.children.find((child) => isWellPickVisualization(child));

    // Can be used as is, no need for further transformations
    return wellpickVisualization?.visualization;
}

function createColorMapDefsFromProduct(factoryProduct: WellLogFactoryProduct | null): ColorMapFunction[] {
    if (!factoryProduct) return [];

    const accData = factoryProduct.accumulatedData;
    const colorMapFuncDefs = _.get(accData, COLOR_MAP_ACC_KEY) ?? [];

    return colorMapFuncDefs;
}

export type ProviderManagerWrapperProps = {
    providerManager: DataProviderManager;
    trajectoryData: WellboreTrajectory_api;
    padDataWithEmptyRows: boolean;
} & Omit<SubsurfaceLogViewerWrapperProps, "wellLogSets" | "wellPicks" | "viewerTemplate">;

export function ProviderManagerWrapper(props: ProviderManagerWrapperProps): React.ReactNode {
    const { trajectoryData, padDataWithEmptyRows, providerManager, ...rest } = props;

    const factoryProduct = useLogViewerVisualizationProduct(providerManager);

    const colorMapFuncDefs = React.useMemo(() => createColorMapDefsFromProduct(factoryProduct), [factoryProduct]);
    const wellPicks = React.useMemo(() => createWellPickPropFromProduct(factoryProduct), [factoryProduct]);
    const template = React.useMemo(() => createWellLogTemplateFromProduct(factoryProduct), [factoryProduct]);

    const wellLogSets = React.useMemo(
        () => createWellLogJsonFromProduct(factoryProduct, trajectoryData, padDataWithEmptyRows),
        [factoryProduct, trajectoryData, padDataWithEmptyRows],
    );

    if (!factoryProduct) {
        return (
            <div className="absolute w-full h-full z-10 bg-white opacity-50 flex items-center justify-center">
                <CircularProgress />
            </div>
        );
    }

    return (
        <SubsurfaceLogViewerWrapper
            viewerTemplate={template}
            wellLogSets={wellLogSets}
            wellPicks={wellPicks}
            colorMapFunctions={colorMapFuncDefs}
            {...rest}
        />
    );
}
