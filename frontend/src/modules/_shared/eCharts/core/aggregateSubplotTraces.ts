export type AggregateSubplotTracesArgs<TTrace, TOptions, TResult> = {
    traces: TTrace[];
    axisIndex: number;
    buildFn: (trace: TTrace, axisIndex: number, options: TOptions) => TResult;
    options?: TOptions;
    onSeriesBuilt?: (series: any[]) => void;
};

export function aggregateSubplotTraces<
    TTrace,
    TOptions,
    TResult extends { series: any[]; legendData: string[] }
>(
    args: AggregateSubplotTracesArgs<TTrace, TOptions, TResult>
): { series: any[]; legendData: string[] } {
    const { traces, axisIndex, options, buildFn, onSeriesBuilt } = args;
    const series: any[] = [];
    const legendData: string[] = [];
    const seenLegend = new Set<string>();

    for (const trace of traces) {
        // Cast `options` to `TOptions` to handle the optionality gracefully 
        // for builders that don't strictly require an options object.
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