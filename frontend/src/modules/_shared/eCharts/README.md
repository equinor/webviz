# Shared ECharts Module

> Agent-facing rules live in [AGENTS.md](AGENTS.md).

## Purpose

Shared charting layer for frontend modules using [Apache ECharts](https://echarts.apache.org/) via `echarts-for-react`. Provides trace-based chart builders, subplot layout, and interactive hooks so that consumer modules only need to supply data and options.

## Architecture

### Trace → Builder → Option

Every chart type follows the same pattern:

1. **Define traces** — typed data objects (`TimeseriesTrace`, `DistributionTrace`, `BarTrace`, etc.) grouped into `SubplotGroup[]`.
2. **Call a chart builder** — e.g. `buildTimeseriesChart(groups, options)`. The builder generates ECharts series, axes, grids, and legend, then composes them into a single `EChartsOption`.
3. **Render** — pass the option to `<ReactECharts option={...} />`.

```ts
const groups: SubplotGroup<TimeseriesTrace>[] = [{ title: "Plot 1", traces }];
const option = buildTimeseriesChart(groups, { base: { containerSize }, series: { displayConfig } });
// → ready for <ReactECharts option={option} />
```

### Chart families

| Family           | Builder                     | Trace type           |
| ---------------- | --------------------------- | -------------------- |
| Timeseries       | `buildTimeseriesChart`      | `TimeseriesTrace`    |
| Histogram        | `buildHistogramChart`       | `DistributionTrace`  |
| Density (KDE)    | `buildDensityChart`         | `DistributionTrace`  |
| Percentile range | `buildPercentileRangeChart` | `DistributionTrace`  |
| Exceedance       | `buildExceedanceChart`      | `DistributionTrace`  |
| Convergence      | `buildConvergenceChart`     | `DistributionTrace`  |
| Bar              | `buildBarChart`             | `BarTrace`           |
| Heatmap          | `buildHeatmapChart`         | `HeatmapTrace`       |
| Member scatter   | `buildMemberScatterChart`   | `MemberScatterTrace` |

### Subplot layout

`computeSubplotGridLayout(numSubplots)` computes a row×col grid. `buildSubplotAxes` creates ECharts grid/xAxis/yAxis entries for each cell. Shared axes are supported via `sharedXAxis` / `sharedYAxis` options.

### Series IDs

Every series gets a structured ID via `makeSeriesId({ chartType, role, name, subKey, axisIndex })`. Use `parseSeriesId(id)` to extract fields. This powers chart-specific tooltip formatting and other series-level metadata lookups.

### Hooks

| Hook                   | Purpose                                                                                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useChartZoomSync`     | Synchronizes persisted `ChartZoomState` with ECharts `datazoom` events while suppressing immediate feedback of chart-originated zoom into the next option rebuild.                |
| `useSeriesInteraction` | Nearest-series highlighting and tooltip for timeseries and scatter charts. Consumes explicit interaction metadata and atomically highlights the hovered entry across all subplots. |
| `useClickToTimestamp`  | Converts chart clicks to timestamp selection (timeseries).                                                                                                                         |

### Timeseries pipeline

The timeseries family uses a shared subplot assembly step to keep rendering and interaction aligned:

1. `buildTimeseriesSubplotArtifacts(...)` decides which subplot series are emitted and in what order.
2. `buildTimeseriesChart(...)` uses those artifacts to build visual series, legend data, axes, and the final `EChartsOption`.
3. `buildTimeseriesInteractionSeries(...)` reuses the same artifacts and converts subplot-local series positions into absolute ECharts series indices for hover/highlight coordination.

This avoids duplicating series-ordering logic between the visual chart builder and the interaction index builder.

### Core pipeline

Under the hood, each chart builder calls `buildCartesianSubplotChart` which:

1. Calls the family's series builder per subplot to get `SeriesBuildResult { series, legendData }`.
2. Calls `buildSubplotAxes` to create grids and axes.
3. Calls `composeChartOption` to merge everything into a final `EChartsOption` with legend, tooltip, and dataZoom.

## Consuming the module

Import from `@modules/_shared/eCharts` for all public symbols. See `EChartsDemo` for a working example of every chart type with interactive features.

## Maintenance

- Keep this README concise and behavior-focused.
- Update this file when architecture conventions change.
- Avoid duplicate guidance between README and AGENTS.
