# Shared ECharts Module

Shared charting layer built on [Apache ECharts](https://echarts.apache.org/) via `echarts-for-react`. Provides typed trace-based chart builders for relevant chart families, a subplot grid system with shared-axis support, and React hooks for zoom persistence, cross-subplot hover interaction, and timestamp selection. Consumer modules supply data as typed traces — the module handles series construction, layout, tooltips, and interaction.

> Agent rules live in [AGENTS.md](AGENTS.md). This file covers architecture and usage.

## Architecture

### Trace → Builder → Option

1. **Define traces** — typed data objects (`TimeseriesTrace`, `DistributionTrace`, `BarTrace`, etc.) grouped into `SubplotGroup[]`.
2. **Call a chart builder** — e.g. `buildTimeseriesChart(groups, options)`. Returns a complete `EChartsOption`.
3. **Render** — pass the option to `<ReactECharts option={...} />`.

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

### Core pipeline

Each builder calls `buildCartesianSubplotChart` which:

1. Calls the family's series builder per subplot → `SeriesBuildResult { series, legendData }`.
2. Calls `buildSubplotAxes` → grids and axes with shared-axis support.
3. Calls `composeChartOption` → final `EChartsOption` with legend, tooltip, dataZoom.

The timeseries family adds a shared artifact step (`buildTimeseriesSubplotArtifacts`) so visual series and interaction indices stay aligned.

### Series IDs

Every series gets a structured ID via `makeSeriesId` (`core/seriesId.ts`), encoding `chartType`, `role`, `name`, `subKey`, and `axisIndex`. Each chart family has an `ids.ts` wrapper.

ECharts tooltip callbacks expose `seriesId` but no structured metadata. Tooltip formatters use `parseSeriesId` to recover chart type, role, and member key. Currently used by timeseries, convergence, and member-scatter tooltips. Other families set IDs as forward-compatible scaffolding.

All consumers use `notMerge` (full option replacement) because subplot count, chart type, and series count change dynamically — merge mode cannot handle these structural changes without manual bookkeeping.

### BaseChartOptions

All builders accept `base: BaseChartOptions`. Every field is optional.

| Field                       | Type             | Default          | Description                                                                                                |
| --------------------------- | ---------------- | ---------------- | ---------------------------------------------------------------------------------------------------------- |
| `zoomState`                 | `ChartZoomState` | —                | Persisted zoom state applied via `dataZoom`                                                                |
| `zoomable`                  | `boolean`        | `false`          | Enable wheel / pinch zoom and box-zoom controls for families that support shared cartesian zoom            |
| `sharedXAxis`               | `boolean`        | `false`          | Hide x-axis labels on all but the bottom subplot                                                           |
| `sharedYAxis`               | `boolean`        | `false`          | Hide y-axis labels on all but the left subplot                                                             |
| `highlightedSubplotIndices` | `number[]`       | —                | Draw a border around selected subplot grids. Indices are zero-based after empty subplots are filtered out. |
| `xAxisLabel`                | `string`         | builder-specific | Override x-axis label                                                                                      |
| `yAxisLabel`                | `string`         | builder-specific | Override y-axis label                                                                                      |
| `showLegend`                | `boolean`        | auto             | Force legend on/off                                                                                        |

Override priority: series-level > `BaseChartOptions` > builder default.

### Selected family options

The families expose additional typed options on top of `BaseChartOptions`. The most migration-relevant ones today are:

| Family           | Options                                                                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Histogram        | `numBins`, `histogramType`, `showMemberPoints`, `showPercentageInBar`, `showStatisticalMarkers`, `showStatisticalLabels`                              |
| Bar              | `sortBy`, `showStatisticalMarkers`, `showLabels`, `maxCategoryLabels`                                                                                 |
| Percentile range | `showMemberPoints`, `centerStatistic`, `showWhiskers`                                                                                                 |
| Timeseries       | `displayConfig`, `subplotOverlays`, `memberLabel`; per-trace `lineShape: "linear" \| "hv" \| "vh"` applied to members, statistics, and fanchart bands |

All cartesian subplot families accept `layoutConfig`. Use `layoutConfig.limitDirection` (`"auto"`, `"columns"`, `"rows"`) with `layoutConfig.maxDirectionElements` to preserve modules that let users cap the number of subplot columns or rows. For uncapped legacy layouts, `layoutConfig.autoLayoutDirection: "rows"` keeps the old rows-first square layout.

### Hooks

| Hook                       | Purpose                                                                 |
| -------------------------- | ----------------------------------------------------------------------- |
| `useChartZoomSync`         | Syncs persisted `ChartZoomState` with ECharts `datazoom` and `restore` events. |
| `useSeriesInteraction`     | Nearest-series highlight + tooltip for timeseries and scatter.          |
| `useTimestampSelection`    | Convenience: bundles click-to-timestamp + markLine with internal state. |

`useTimestampSelection` is the public hook for the common case where the module owns the timestamp. The lower-level primitives `useClickToTimestamp` and `useActiveTimestampMarker` exist inside the module internals but are not exported from the public `@modules/_shared/eCharts` barrel.

## Consuming the module

Import from `@modules/_shared/eCharts`. The `EChartsDemo` module has one recipe per chart family in `EChartsDemo/view/recipes/`:

| Recipe                   | Chart type(s)                                                 | Hooks                                           |
| ------------------------ | ------------------------------------------------------------- | ----------------------------------------------- |
| `TimeseriesRecipe.tsx`   | Timeseries (members, statistics, fanchart, overlays)          | `useTimestampSelection`, `useSeriesInteraction` |
| `DistributionRecipe.tsx` | Histogram, density, percentile range, exceedance, convergence | —                                               |
| `BarRecipe.tsx`          | Bar chart                                                     | —                                               |
| `HeatmapRecipe.tsx`      | Heatmap                                                       | —                                               |
| `ScatterRecipe.tsx`      | Member scatter                                                | `useSeriesInteraction`                          |

Zoom is owned by the parent view (`view.tsx`), not by recipes. Recipes receive `appliedZoomState`, `handleDataZoom`, and `handleRestore` via `RecipeProps`, and the parent decides whether zoom is enabled by passing `zoomable` in the base options.

### Custom series (bring your own)

For modules that don't fit an existing chart family (e.g. PVT curves, VFP tables), use `buildCartesianSubplotChart` directly with a custom series factory:

```ts
import type { LineSeriesOption } from "echarts/charts";
import {
    buildCartesianSubplotChart,
    type CartesianSubplotBuildResult,
    type SubplotGroup,
} from "@modules/_shared/eCharts";

interface PvtLine {
    name: string;
    color: string;
    xValues: number[];
    yValues: number[];
}

const xAxisLabel = "Pressure";
const yAxisLabel = "Volume factor";

function buildPvtSubplot(group: SubplotGroup<PvtLine>, axisIndex: number): CartesianSubplotBuildResult {
    const series: LineSeriesOption[] = group.traces.map(function buildTrace(trace) {
        return {
            type: "line",
            name: trace.name,
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            data: trace.xValues.map((x, i) => [x, trace.yValues[i]]),
            itemStyle: { color: trace.color },
            showSymbol: true,
            symbolSize: 4,
        };
    });

    return {
        series,
        legendData: group.traces.map((t) => t.name),
        xAxis: { type: "value", label: xAxisLabel },
        yAxis: { type: "value", label: yAxisLabel },
    };
}

const option = buildCartesianSubplotChart(subplotGroups, buildPvtSubplot, { zoomable: true });
```

The shared pipeline handles subplot grid layout, axis wiring, legend dedup, and option composition. The consumer only writes the series factory.

Bar charts align categories across every trace in a subplot before rendering. If one trace is missing a category that appears in another trace, the missing value renders as a gap rather than a zero-height bar.

## Design decisions

Why not just use native ECharts features?

| What we built                                          | Why native ECharts isn't enough                                                                                                                                                                                        |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Subplot pipeline** (`buildCartesianSubplotChart`)    | ECharts has `grid` + multi-axis, but no high-level subplot abstraction. Coordinating N grids, shared axes, and legend dedup requires boilerplate that every chart family would repeat.                                 |
| **Cross-subplot interaction** (`useSeriesInteraction`) | Built-in `emphasis`/`blur` operates per-series. We need to highlight matching members across all subplots atomically (e.g. hover "Group A, member 3" → highlight in all 4 subplots).                                   |
| **Large member renderer** (`buildMemberSeriesLarge`)   | Creating one `LineSeriesOption` per member works for ~50 members. At 200+ the series model overhead dominates — the custom polyline renderer collapses N series into 1 with progressive rendering.                     |
| **Imperative markLine** (`useActiveTimestampMarker`)   | Rebuilding the full option on every timestamp change causes flicker and resets zoom animation. A targeted `setOption({ series })` patches only the markLine.                                                           |
| **DOM click listener** (`useClickToTimestamp`)         | `echarts-for-react` does init → dispose → re-init during its initial sizing pass. ZR-level listeners attached to the first instance die silently. Native DOM `addEventListener` on the container survives the re-init. |

## Migration strategy

Target modules for replacing Plotly with this shared ECharts module.

### SimulationTimeSeries — ready now

Near 1:1 feature match. Members, fan chart, statistics lines, click-to-timestamp, zoom persistence, multi-subplot with shared x-axis, cross-subplot hover, and per-trace step-line shapes (`linear` / `hv` / `vh`) are all supported.

Remaining enhancement before a colorbar-complete migration:

| Feature                                 | Effort | Notes                                                                                                                                |
| --------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Parameter-colored members with colorbar | Medium | `memberColors` already supports per-member coloring. Missing piece is a `visualMap` colorbar legend for continuous parameter scales. |

Observation markers with error bars are already covered by `PointAnnotationTrace`. Historical lines are covered by `ReferenceLineTrace`.

### InplaceVolumesNew — ready

Histogram (all modes), bar, convergence, and density can migrate now. Box plot use case is covered by the percentile range chart. Violin (on roadmap) is a nice-to-have, not a blocker.

### ParameterDistributions — ready, same virtualization pattern

One histogram per parameter in a scrollable grid (50-200+ parameters). The existing IntersectionObserver virtualization wrapper is framework-agnostic — replace `<Plot>` with `<ReactECharts>` inside visible cells. ECharts instances are significantly lighter than Plotly, so the performance ceiling is higher. For smaller parameter sets, virtualization may not be needed at all.

## Roadmap

Planned chart families and enhancements, roughly by priority.

| Item                              | Type                      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tornado / sensitivity**         | New family                | Horizontal diverging bars with `base` positioning, reference line, optional member scatter overlay. Replaces Plotly in `SensitivityPlot`. Needs own `TornadoTrace` — low/high segments with computed bases are not a plain bar chart.                                                                                                                                                                                                                            |
| **Correlation bar**               | New family or bar variant | Horizontal signed bars sorted by absolute magnitude, reversed category axis, click-to-highlight across subplots. Replaces Plotly in `ParameterResponseCorrelationBarPlot`. May fit as a `BarTrace` extension with `orientation: 'horizontal'`.                                                                                                                                                                                                                   |
| **Regression line on scatter**    | Enhancement               | Optional `regressionLine` field on `MemberScatterTrace` (slope, intercept, optional confidence band). Builder adds line + area series when present.                                                                                                                                                                                                                                                                                                              |
| **Violin plot**                   | New family                | Mirrored KDE shape with optional box overlay (median, IQR). Can reuse `DistributionTrace` since KDE data is already there. Custom `renderItem` for the mirrored filled path.                                                                                                                                                                                                                                                                                     |
| **Waterfall**                     | New family                | Vertical stacked bars with invisible base segments for cumulative flow (e.g. bulk→STOIIP, SWATINIT→SWAT). ECharts has no native waterfall — builder computes base/delta from `absolute`/`relative`/`total` measures. `WaterfallTrace` with `{ categories, values, measures, colors? }`. Spanning connectors via custom `renderItem` or markLine between bar tops. Bar text shows delta + percentage. Replaces Plotly `go.Waterfall` in inplace volume workflows. |
| **Test coverage**                 | Quality                   | Builder-level tests for bar, heatmap, memberScatter, timeseries families, and all hooks. Pattern: trace in → option out, assert series count / axis config / legend.                                                                                                                                                                                                                                                                                             |
| **Tooltip contract**              | Refactor                  | Unify family-specific `tooltips.ts` files behind a shared typed tooltip-builder interface. Keep family-specific row content, standardize where tooltip is attached (chart-level vs series-level).                                                                                                                                                                                                                                                                |
| **Theme tokens**                  | Enhancement               | Replace hardcoded tooltip styles, heatmap palette, and default colors with a token object on `BaseChartOptions`. Designed to plug into an external design system.                                                                                                                                                                                                                                                                                                |
| **Accessibility**                 | Enhancement               | Wire ECharts built-in `aria` config centrally in `composeChartOption`. Add keyboard equivalents for hover/selection hooks.                                                                                                                                                                                                                                                                                                                                       |
| **Virtualized multi-chart grids** | Enhancement               | Reusable pattern for rendering many small ECharts instances in a scrollable container (e.g. one histogram per parameter). Use `react-window` `FixedSizeGrid` with overscan — lighter than the current IntersectionObserver approach and handles mount/unmount natively.                                                                                                                                                                                          |
