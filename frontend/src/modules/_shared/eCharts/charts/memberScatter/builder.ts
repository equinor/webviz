import { createSimpleChartBuilder, type SimpleChartOptions } from "../../core/simpleChartFactory";
import type { MemberScatterTrace } from "../../types";

import { buildMemberScatterSeries } from "./series";
import { buildMemberScatterTooltip } from "./tooltips";

export interface MemberScatterSeriesOptions {
    memberLabel?: string;
}

export type MemberScatterChartOptions = SimpleChartOptions<MemberScatterSeriesOptions>;

export const buildMemberScatterChart = createSimpleChartBuilder<MemberScatterTrace, MemberScatterSeriesOptions>({
    defaultXAxisLabel: "X",
    defaultYAxisLabel: "Y",
    buildSeries: buildMemberScatterSeries,
    buildTooltip: (seriesOptions) => buildMemberScatterTooltip({ memberLabel: seriesOptions.memberLabel }),
});
