import { createSimpleChartBuilder, type SimpleChartOptions } from "../../core/simpleChartFactory";
import type { DistributionTrace } from "../../types";

import { buildDensitySeries, type DensityDisplayOptions } from "./series";
import { buildDensityTooltip } from "./tooltips";

export type DensityChartOptions = SimpleChartOptions<DensityDisplayOptions>;

export const buildDensityChart = createSimpleChartBuilder<DistributionTrace, DensityDisplayOptions>({
    defaultXAxisLabel: "Value",
    defaultYAxisLabel: "Density",
    xAxisScale: true,
    buildSeries: buildDensitySeries,
    buildTooltip: () => buildDensityTooltip(),
});
