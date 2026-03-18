import type { CallbackDataParams } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { formatCompactTooltip } from "../../core/tooltip";

type HistogramBarValue = [number, number, number, number];
type RugPointValue = [number, number];
type RugPointDatum = { value: RugPointValue; realizationId: number };

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

function toHistogramBarValue(value: CallbackDataParams["value"]): HistogramBarValue | null {
    if (!Array.isArray(value) || value.length < 4) return null;
    return [Number(value[0]), Number(value[1]), Number(value[2]), Number(value[3])];
}

function toRugPointValue(value: CallbackDataParams["value"]): RugPointValue | null {
    if (!Array.isArray(value) || value.length < 2) return null;
    return [Number(value[0]), Number(value[1])];
}

function isRugPointDatum(data: unknown): data is RugPointDatum {
    if (!data || typeof data !== "object") return false;
    const candidate = data as Partial<RugPointDatum>;
    return Array.isArray(candidate.value) && typeof candidate.realizationId === "number";
}