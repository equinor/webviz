import type { CallbackDataParams } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { formatCompactTooltip } from "./core";
import { isRugPointDatum, toHistogramBarValue, toRugPointValue } from "./runtime";

export function createHistogramBarTooltipFormatter(traceName: string, traceColor: string) {
    return function formatHistogramBarItemTooltip(params: CallbackDataParams): string {
        const value = toHistogramBarValue(params.value);
        if (!value) return traceName;

        const [xStart, xEnd, yStart, yEnd] = value;
        const percentage = yEnd - yStart;

        return formatCompactTooltip(traceName, [
            { label: "Range", value: `${formatNumber(xStart)} - ${formatNumber(xEnd)}`, color: traceColor },
            { label: "Percentage", value: `${percentage.toFixed(2)}%`, color: traceColor },
        ]);
    };
}

export function createHistogramRugTooltipFormatter(traceName: string, traceColor: string) {
    return function formatHistogramRugItemTooltip(params: CallbackDataParams): string {
        const value = toRugPointValue(params.value);
        if (!value) return traceName;

        const realizationId = isRugPointDatum(params.data) ? params.data.realizationId : params.dataIndex;

        return formatCompactTooltip(traceName, [
            { label: "Value", value: formatNumber(value[0]), color: traceColor },
            { label: "Realization", value: String(realizationId), color: traceColor },
        ]);
    };
}
