# Shared ECharts Guide

> Agent-facing rules live in [AGENTS.md](AGENTS.md).

## Purpose

This folder is the shared charting layer for frontend modules using ECharts.

It standardizes:

- trace input contracts
- subplot layout and axis composition
- tooltip and legend styling
- reusable series builders
- shared chart interaction behavior

Modules should map domain data into shared trace types and call shared builders, instead of constructing large raw ECharts option objects.

## Data Flow

1. Module maps domain data into shared trace types.
2. Module groups traces into `SubplotGroup<T>[]`.
3. Shared builder composes layout, axes, series, legend, and tooltip behavior.
4. Module renders `ReactECharts` and attaches interaction hooks as needed.

## Folder Map

- `types.ts`: shared trace and display config contracts.
- `builders/`: high-level chart option builders (`EChartsOption`).
- `series/`: series builders returning `SeriesBuildResult`.
- `layout/`: subplot grid and axis helpers.
- `interaction/`: non-tooltip interaction helpers plus `tooltips/` for tooltip policy/rendering.
- `hooks/`: React interaction hooks.
- `utils/`: pure calculations and ID helpers.
- `index.ts`: public exports.

## Tooltip Ownership Contract

### Layer Responsibilities

| Layer                    | Owner                                                        | Responsibility                                                                                     |
| ------------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Global style             | `builders/composeChartOption.ts` + `interaction/tooltips/core.ts` | Compact tooltip defaults (padding, text style) and shared HTML row/header primitives.             |
| Chart-level behavior     | `builders/*`                                                 | Tooltip trigger mode (`axis` vs `item`), axis pointer policy, and selection of chart-family policy. |
| Chart-family rendering   | `interaction/tooltips/<family>.ts`                           | Tooltip formatting and policy helpers for a single chart family.                                   |
| Series-level override    | `series/*`                                                   | Helper-series suppression and item-only overrides that delegate back to chart-family tooltip helpers. |

Rules:

- Keep tooltip formatting logic in `interaction/tooltips/`.
- Builders own chart-level tooltip policy, even when a family supports both `axis` and `item` modes.
- Item-only glyph/point series may attach a formatter in `series/*`, but the formatter must come from the same chart-family tooltip module.
- Do not inline tooltip formatter logic in builders or series files.
- Re-export public tooltip helpers from `interaction/index.ts`.

### Current Chart Family Pattern

| Chart family        | Primary tooltip owner               | Notes                                                                                                       |
| ------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Timeseries          | Builder + observation series        | Builder switches between axis/item tooltip policy; observation series keeps its own item tooltip content.   |
| Bar                 | Builder + mean helper series        | Builder owns axis tooltip; the mean reference line uses an item tooltip helper from the bar tooltip module. |
| Histogram           | Series via histogram tooltip module | Custom bars and rug points are item-only and delegate to histogram tooltip formatter factories.             |
| Heatmap             | Builder                             | Builder owns item tooltip policy and heatmap-specific rendering.                                            |
| Convergence         | Builder + helper-series suppression | Builder owns axis tooltip policy; custom band suppresses tooltips.                                          |
| Exceedance          | Builder                             | Builder owns y-axis hover semantics and formatter selection.                                                |
| Percentile range    | Series via percentile tooltip module | Glyph and realization points are item-only and delegate to percentile tooltip formatter factories.          |
| Density             | Default/global                      | No custom formatter unless future requirements demand one.                                                  |
| Realization scatter | Builder                             | Builder owns item tooltip policy and renderer selection.                                                    |

## Core Conventions

- All cartesian chart builders must use `buildCartesianSubplotChart`.
- Use `postProcessAxes` for post-build axis changes.
- All exported series builders return `SeriesBuildResult`:

```ts
type SeriesBuildResult = {
    series: ChartSeriesOption[];
    legendData: string[];
};
```

- Series builders own `xAxisIndex` and `yAxisIndex`.
- Use structured series IDs from `utils/seriesId.ts` (`category:name:qualifier:axisIndex`).
- `legendData` should include only names that produced rendered series.

## Adding Or Changing A Chart

1. Map domain data to shared trace types in the module layer.
2. Build `SubplotGroup<T>[]`.
3. Use an existing shared builder if possible.
4. Add or update chart-family tooltip helpers under `interaction/tooltips/`.
5. Keep chart-level trigger and axis-pointer choices in the builder.
6. Add/adjust unit tests under `tests/unit/eCharts/`.

## Validation

Run before finishing changes:

```bash
npx vitest run tests/unit/eCharts/
npx tsc --noEmit
npx eslint src/modules/_shared/eCharts/
```

## Maintenance

- Keep this README concise and behavior-focused.
- Update this file when architecture conventions change.
- Avoid duplicate guidance between README and AGENTS.
