import React from "react";

import { CircularProgress } from "@mui/material";
import type { WellLogSet } from "@webviz/well-log-viewer/dist/components/WellLogTypes";
import type { WellPickProps } from "@webviz/well-log-viewer/dist/components/WellLogView";
import type { ColorMapFunction } from "@webviz/well-log-viewer/dist/utils/color-function";

import type { WellboreTrajectory_api } from "@api";
import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import type { Template, TemplatePlot, TemplateTrack } from "@modules/_shared/types/wellLogTemplates";
import { isWellPickVisualization } from "@modules/_shared/types/wellpicks";
import { getUniqueCurveNameForPlotConfig } from "@modules/_shared/utils/wellLog";
import { MAIN_AXIS_CURVE } from "@modules/WellLogViewer/constants";
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
import type { WellLogFactoryProduct } from "@modules/WellLogViewer/hooks/useLogViewerVisualizationProduct";
import { useLogViewerVisualizationProduct } from "@modules/WellLogViewer/hooks/useLogViewerVisualizationProduct";
import { createLogViewerWellPicks, createWellLogSets } from "@modules/WellLogViewer/utils/queryDataTransform";
import { trajectoryToIntersectionReference } from "@modules/WellLogViewer/utils/trajectory";

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

                    // Over/under colors. For now, we just use the curve's own color.
                    // TODO: Make this based on a dedicated setting
                    fill: primaryPlot.color,
                    fill2: secondaryPlot.color,
                });
            }
        }
    }

    return plots;
}

function createWellLogTemplateFromProduct(factoryProduct: WellLogFactoryProduct | null): Template {
    const tracks: TemplateTrack[] = [];
    const accData = factoryProduct?.accumulatedData;

    const duplicatedCurveNames = accData?.[DUPLICATE_NAMES_ACC_KEY] || new Set();

    for (const child of factoryProduct?.children ?? []) {
        if (!isTrackGroup(child)) continue;

        const templatePlots = getProvidedPlots(child, duplicatedCurveNames);
        const templateProps = child.customProps;

        tracks.push({
            ...templateProps,
            plots: templatePlots,
        });
    }

    return {
        // AFAIK, this name is not shown anywhere
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
    const curveData = accData[DATA_ACC_KEY];
    const duplicatedCurveNames = accData[DUPLICATE_NAMES_ACC_KEY];

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

    const wellPickProviders = factoryProduct.children.filter(isWellPickVisualization);
    const wellPickCollections = wellPickProviders.map((wpp) => wpp.visualization);

    return createLogViewerWellPicks(wellPickCollections) ?? undefined;
}

function createColorMapDefsFromProduct(factoryProduct: WellLogFactoryProduct | null): ColorMapFunction[] {
    if (!factoryProduct) return [];

    const accData = factoryProduct.accumulatedData;
    const colorMapFuncDefs = accData[COLOR_MAP_ACC_KEY] ?? [];

    return colorMapFuncDefs;
}

export type ProviderVisualizationWrapperProps = {
    providerManager: DataProviderManager;
    trajectoryData: WellboreTrajectory_api;
    padDataWithEmptyRows: boolean;
} & Omit<SubsurfaceLogViewerWrapperProps, "wellLogSets" | "wellPicks" | "viewerTemplate">;

export function ProviderVisualizationWrapper(props: ProviderVisualizationWrapperProps): React.ReactNode {
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
