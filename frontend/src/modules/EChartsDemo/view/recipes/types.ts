import type { ViewContext } from "@framework/ModuleContext";
import type { BaseChartOptions, ChartZoomState } from "@modules/_shared/eCharts";

import type { Interfaces } from "../../interfaces";

export type RecipeProps = {
    viewContext: ViewContext<Interfaces>;
    scrollMode: boolean;
    numSubplots: number;
    /** Already-processed zoom state ready for BaseChartOptions.zoomState. */
    appliedZoomState: ChartZoomState | undefined;
    /** Wire to ReactECharts onEvents.datazoom. */
    handleDataZoom: (params: unknown) => void;
};

export type BaseOptions = {
    layoutConfig: { sharedXAxis: boolean; sharedYAxis: boolean; zoomEnabled: boolean };
    appliedZoomState: ChartZoomState | undefined;
};

export function makeBaseOptions(opts: BaseOptions): BaseChartOptions {
    return {
        sharedXAxis: opts.layoutConfig.sharedXAxis,
        sharedYAxis: opts.layoutConfig.sharedYAxis,
        zoomable: opts.layoutConfig.zoomEnabled,
        zoomState: opts.layoutConfig.zoomEnabled ? opts.appliedZoomState : undefined,
    };
}
