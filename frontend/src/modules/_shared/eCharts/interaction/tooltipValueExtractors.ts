import type { CallbackDataParams } from "echarts/types/dist/shared";

/** ECharts adds axisValue at runtime for axis-trigger tooltips, but it's not in CallbackDataParams. */
export type AxisTooltipParams = CallbackDataParams & { axisValue?: string | number };

export type AxisScopedTooltipParams = AxisTooltipParams & {
    axisIndex?: number;
    axisId?: string | number;
    xAxisIndex?: number;
    xAxisId?: string | number;
};

export type TooltipEntry = {
    axisValue?: string | number;
    axisValueLabel?: string | number;
    seriesId?: string;
    seriesName?: string;
    color?: string;
    value?: unknown;
};

export type ObservationTooltipDatum = {
    value: [string, number, number];
    label: string;
    comment?: string;
};

type HistogramBarValue = [number, number, number, number];
type RugPointValue = [number, number];
type RugPointDatum = { value: RugPointValue; realizationId: number };

export function isTooltipEntry(value: unknown): value is TooltipEntry {
    return Boolean(value && typeof value === "object");
}

export function isObservationTooltipDatum(value: unknown): value is ObservationTooltipDatum {
    if (!value || typeof value !== "object") return false;
    const candidate = value as Partial<ObservationTooltipDatum>;
    return (
        typeof candidate.label === "string" &&
        Array.isArray(candidate.value) &&
        candidate.value.length >= 3 &&
        typeof candidate.value[0] === "string"
    );
}

export function extractNumericValue(value: unknown): number {
    if (Array.isArray(value)) {
        return Number(value[value.length - 1] ?? value[1] ?? value[0] ?? 0);
    }
    return Number(value ?? 0);
}

export function extractPointValue(value: unknown): [number, number] | null {
    if (!Array.isArray(value) || value.length < 2) return null;
    return [Number(value[0]), Number(value[1])];
}

export function toHistogramBarValue(value: CallbackDataParams["value"]): HistogramBarValue | null {
    if (!Array.isArray(value) || value.length < 4) return null;
    return [Number(value[0]), Number(value[1]), Number(value[2]), Number(value[3])];
}

export function toRugPointValue(value: CallbackDataParams["value"]): RugPointValue | null {
    if (!Array.isArray(value) || value.length < 2) return null;
    return [Number(value[0]), Number(value[1])];
}

export function isRugPointDatum(data: unknown): data is RugPointDatum {
    if (!data || typeof data !== "object") return false;
    const candidate = data as Partial<RugPointDatum>;
    return Array.isArray(candidate.value) && typeof candidate.realizationId === "number";
}
