import type { SubplotAxesResult } from "../../layout/subplotAxes";
import { createSimpleChartBuilder, type SimpleChartOptions } from "../../core/simpleChartFactory";
import type { DistributionTrace } from "../../types";

import { buildExceedanceSeries, type ExceedanceDisplayOptions } from "./series";
import { buildExceedanceTooltip } from "./tooltips";

export type ExceedanceChartOptions = SimpleChartOptions<ExceedanceDisplayOptions>;

export const buildExceedanceChart = createSimpleChartBuilder<DistributionTrace, ExceedanceDisplayOptions>({
    defaultXAxisLabel: "Value",
    defaultYAxisLabel: "Exceedance (%)",
    xAxisScale: true,
    buildSeries: buildExceedanceSeries,
    buildTooltip: () => buildExceedanceTooltip(),
    postProcessAxes: constrainExceedanceYAxis,
});

/** Clamp all y-axes to the 0..100 exceedance percentage range. */
function constrainExceedanceYAxis(axes: SubplotAxesResult): void {
    for (let index = 0; index < axes.yAxes.length; index++) {
        axes.yAxes[index] = { ...axes.yAxes[index], min: 0, max: 100 };
    }
}
