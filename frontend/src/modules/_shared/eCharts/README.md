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
4. Module renders `ReactECharts` and composes the needed interaction hooks explicitly.

## Folder Map

- `families/`: primary home for chart slices. Keep chart-specific builder/series/tooltip/ID logic together here.
- `types.ts`: shared trace and display config contracts.
- `builders/`: shared chart composition utilities and export barrel.
- `layout/`: subplot grid and axis helpers.
- `interaction/`: non-tooltip interaction helpers plus shared `tooltips/` primitives.
- `hooks/`: React interaction hooks.
- `utils/`: pure calculations and ID helpers.
- `index.ts`: public exports, including direct re-exports of series builders from the owning family slices.

## Tooltip Ownership Contract

### Layer Responsibilities

| Layer                  | Owner                                                             | Responsibility                                                                                        |
| ---------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Global style           | `builders/composeChartOption.ts` + `interaction/tooltips/core.ts` | Compact tooltip defaults (padding, text style) and shared HTML row/header primitives.                 |
| Chart-level behavior   | `families/<family>/<chart>/builder.ts`                            | Tooltip trigger mode (`axis` vs `item`), axis pointer policy, and composition of the chart slice.     |
| Chart-family rendering | `families/<family>/<chart>/tooltips.ts`                           | Tooltip formatting and policy helpers colocated with the owning chart slice.                          |
| Series-level override  | `families/<family>/<chart>/*Series.ts`                            | Helper-series suppression and item-only overrides that delegate back to chart-family tooltip helpers. |

Rules:

- Keep only shared tooltip primitives in `interaction/tooltips/`.
- Colocate all chart-specific tooltip formatting with the chart slice under `families/`.
- Builders own chart-level tooltip policy, even when a family supports both `axis` and `item` modes.
- Item-only glyph/point series may attach a formatter in the slice series file, but the formatter must come from the same chart-family tooltip module.
- Do not inline tooltip formatter logic in slice builders or slice series files.
- Do not re-export chart-specific tooltip helpers through `interaction/index.ts`.
- When timeseries uses a custom member label, pass the same label to both `buildTimeseriesChart()` and `useClosestMemberTooltip()` so standard and closest-member tooltips stay aligned.

Common exceptions:

- Timeseries uses builder-owned policy plus item-level observation tooltips.
- Histogram and percentile range are item-heavy and rely on series-level formatters from their chart-family tooltip modules.
- Helper series such as bands/fancharts should usually suppress tooltips with `tooltip.show = false`.

## Core Conventions

- All cartesian chart builders must use `buildCartesianSubplotChart`.
- Use `postProcessAxes` for post-build axis changes.
- Put builder-specific inputs in a typed options object instead of stacking extra positional arguments.
- All exported series builders return `SeriesBuildResult`:

```ts
type SeriesBuildResult = {
    series: ChartSeriesOption[];
    legendData: string[];
};
```

- Series builders own `xAxisIndex` and `yAxisIndex`.
- Use structured series IDs from `utils/seriesId.ts` (`category:name:qualifier:axisIndex`). Prefer chart-local wrappers around `makeSeriesId()` for migrated slices.
- `legendData` should include only names that produced rendered series.

## Adding Or Changing A Chart

1. Map domain data to shared trace types in the module layer.
2. Build `SubplotGroup<T>[]`.
3. Prefer building inside an existing family/chart slice or adding a new slice under `families/`.
4. Add or update chart-local tooltip helpers beside the owning chart slice under `families/`.
5. Keep chart-level trigger and axis-pointer choices in the builder.
6. Add/adjust unit tests under `tests/unit/eCharts/`.

Interaction guidance:

- Prefer composing `useHighlightOnHover()`, `useClickToTimestamp()`, and `useClosestMemberTooltip()` directly in module views.
- Avoid shared wrapper hooks or shared `ReactECharts` wrapper components that mix chart rendering with chart-specific interaction policy.
- If repeated layout boilerplate eventually appears across several modules, a thin presentational wrapper may be added, but it should not own tooltip, hover-linking, or chart-family behavior.

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
