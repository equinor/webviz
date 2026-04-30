import type { ChartSeriesOption } from "./composeChartOption";

export type AggregateSubplotTracesArgs<TTrace, TOptions, TResult> = {
    traces: TTrace[];
    axisIndex: number;
    buildFn: (trace: TTrace, axisIndex: number, options: TOptions) => TResult;
    options?: TOptions;
    onSeriesBuilt?: (series: ChartSeriesOption[]) => void;
};

/**
 * Iterates traces within a single subplot, calling `buildFn` for each,
 * then merges the resulting series arrays and deduplicates legend entries.
 */
export function aggregateSubplotTraces<
    TTrace,
    TOptions,
    TResult extends { series: ChartSeriesOption[]; legendData: string[] }
>(
    args: AggregateSubplotTracesArgs<TTrace, TOptions, TResult>
): { series: ChartSeriesOption[]; legendData: string[] } {
    const { traces, axisIndex, options, buildFn, onSeriesBuilt } = args;
    const series: ChartSeriesOption[] = [];
    const legendData: string[] = [];
    const seenLegend = new Set<string>();

    for (const trace of traces) {
        const result = buildFn(trace, axisIndex, options as TOptions);

        if (onSeriesBuilt) onSeriesBuilt(result.series);

        series.push(...result.series);
        for (const name of result.legendData) {
            if (!seenLegend.has(name)) {
                legendData.push(name);
                seenLegend.add(name);
            }
        }
    }

    return { series, legendData };
}