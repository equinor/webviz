import { createSimpleChartBuilder, type SimpleChartOptions } from "../../core/simpleChartFactory";
import type { DistributionTrace } from "../../types";

import { buildConvergenceSeries } from "./series";
import { buildConvergenceTooltip } from "./tooltips";

export type ConvergenceChartOptions = SimpleChartOptions<Record<string, never>>;

export const buildConvergenceChart = createSimpleChartBuilder<DistributionTrace>({
    defaultXAxisLabel: "Members",
    defaultYAxisLabel: "Value",
    yAxisScale: true,
    buildSeries: (trace, axisIndex) => buildConvergenceSeries(trace, axisIndex),
    buildTooltip: () => buildConvergenceTooltip(),
});
