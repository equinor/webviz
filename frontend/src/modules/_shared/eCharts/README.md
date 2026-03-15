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
- `interaction/`: tooltip and interaction helpers.
- `hooks/`: React interaction hooks.
- `utils/`: pure calculations and ID helpers.
- `index.ts`: public exports.

## Tooltip Ownership Contract

### Layer Responsibilities

| Layer                    | Owner                                                                 | Responsibility                                                                            |
| ------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Global style             | `builders/composeChartOption.ts` + `interaction/tooltipFormatters.ts` | Compact tooltip defaults (padding, text style).                                           |
| Chart-level behavior     | `builders/*`                                                          | Tooltip trigger mode (`axis` vs `item`), axis pointer policy, shared formatter selection. |
| Series-level override    | `series/*`                                                            | Item-specific rows or helper-series suppression (`tooltip.show = false`).                 |
| Formatter implementation | `interaction/tooltip*Formatters.ts`                                   | Tooltip content formatting and shared HTML row/header primitives.                         |

Rules:

- Keep tooltip formatter logic in `interaction/`.
- Do not inline tooltip formatter logic in builders or series files.
- Re-export public formatters from `interaction/index.ts`.

### Current Chart Family Pattern

| Chart family        | Primary tooltip owner               | Notes                                                                                              |
| ------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| Timeseries          | Builder + selected series overrides | Builder switches between axis/item tooltip mode; observation series provides item tooltip content. |
| Bar                 | Builder + series override           | Builder controls axis tooltip for bars; mean reference line uses series-level item tooltip.        |
| Histogram           | Series                              | Custom bars and rug points use item-specific tooltip formatters.                                   |
| Heatmap             | Builder                             | Builder uses item trigger and heatmap-specific formatter.                                          |
| Convergence         | Builder + helper-series suppression | Builder formats axis tooltip; custom band suppresses tooltip.                                      |
| Exceedance          | Builder                             | Builder formats y-axis based hover semantics.                                                      |
| Percentile range    | Series                              | Glyph and realization points provide item-specific tooltip rows.                                   |
| Density             | Default/global                      | No custom formatter unless future requirements demand one.                                         |
| Realization scatter | Builder                             | Builder uses item tooltip formatter.                                                               |

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
4. Add or update chart-family tooltip formatter functions under `interaction/`.
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
