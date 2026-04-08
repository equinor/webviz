import React from "react";

import { useAtom } from "jotai";

import type { ModuleViewProps } from "@framework/Module";
import { useChartZoomSync } from "@modules/_shared/eCharts";

import type { Interfaces } from "../interfaces";
import { PLOT_TYPE_LABELS, PlotType } from "../typesAndEnums";

import { chartZoomAtom } from "./atoms/baseAtoms";
import { BarRecipe } from "./recipes/BarRecipe";
import { CustomRecipe } from "./recipes/CustomRecipe";
import { DistributionRecipe } from "./recipes/DistributionRecipe";
import { HeatmapRecipe } from "./recipes/HeatmapRecipe";
import { ScatterRecipe } from "./recipes/ScatterRecipe";
import { TimeseriesRecipe } from "./recipes/TimeseriesRecipe";
import type { RecipeProps } from "./recipes/types";

const DISTRIBUTION_PLOT_TYPES = new Set([
    PlotType.Histogram,
    PlotType.PercentileRange,
    PlotType.Density,
    PlotType.Exceedance,
    PlotType.Convergence,
]);

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const { viewContext } = props;

    const dataConfig = viewContext.useSettingsToViewInterfaceValue("dataConfig");
    const layoutConfig = viewContext.useSettingsToViewInterfaceValue("layoutConfig");
    const { plotType, numSubplots, numGroups, numMembers, numTimesteps } = dataConfig;

    // ── Zoom (shared across all chart types) ─────────────────────────────
    const [viewState, setViewState] = useAtom(chartZoomAtom);
    const { appliedZoomState, handleDataZoom } = useChartZoomSync(viewState, setViewState);

    const instanceTitle = `${PLOT_TYPE_LABELS[plotType]} (Plots: ${numSubplots} Groups: ${numGroups} Members: ${numMembers} Steps: ${numTimesteps})`;
    React.useEffect(() => {
        viewContext.setInstanceTitle(instanceTitle);
    }, [viewContext, instanceTitle]);

    const recipeProps: RecipeProps = {
        viewContext,
        scrollMode: layoutConfig.scrollMode,
        numSubplots,
        appliedZoomState,
        handleDataZoom,
    };

    return (
        <div className="w-full h-full overflow-auto relative">
            <RecipeSwitch plotType={plotType} recipeProps={recipeProps} />
        </div>
    );
}

function RecipeSwitch({ plotType, recipeProps }: { plotType: PlotType; recipeProps: RecipeProps }): React.ReactNode {
    if (plotType === PlotType.Timeseries)       return <TimeseriesRecipe {...recipeProps} />;
    if (plotType === PlotType.Bar)               return <BarRecipe {...recipeProps} />;
    if (plotType === PlotType.Heatmap)           return <HeatmapRecipe {...recipeProps} />;
    if (plotType === PlotType.MemberScatter)     return <ScatterRecipe {...recipeProps} />;
    if (plotType === PlotType.Custom)            return <CustomRecipe {...recipeProps} />;
    if (DISTRIBUTION_PLOT_TYPES.has(plotType))   return <DistributionRecipe {...recipeProps} />;
    return null;
}
