export enum PlotType {
    Histogram = "histogram",
    BarChart = "barchart",
    Scatter = "scatter",
    ScatterWithColorMapping = "scatterWithColor",
    StatisticsTable = "statisticsTable",
}
export enum BarSortBy {
    Value = "value",
    Key = "key",
}

export enum StatisticsColumn {
    Mean = "mean",
    P10 = "p10",
    P50 = "p50",
    P90 = "p90",
    StdDev = "stdDev",
    Min = "min",
    Max = "max",
    Count = "count",
}

export const STATISTICS_COLUMN_LABELS: Record<StatisticsColumn, string> = {
    [StatisticsColumn.Mean]: "Mean",
    [StatisticsColumn.P10]: "P10",
    [StatisticsColumn.P50]: "P50",
    [StatisticsColumn.P90]: "P90",
    [StatisticsColumn.StdDev]: "Std Dev",
    [StatisticsColumn.Min]: "Min",
    [StatisticsColumn.Max]: "Max",
    [StatisticsColumn.Count]: "Count",
};

export const ALL_STATISTICS_COLUMNS: StatisticsColumn[] = Object.values(StatisticsColumn);
