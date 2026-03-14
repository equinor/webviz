# eCharts Shared Module — Agent Instructions

## Architecture

- All cartesian chart builders must go through `buildCartesianSubplotChart` in `builders/cartesianSubplotChartBuilder.ts`. Do not bypass the base builder pipeline.
- Use `postProcessAxes` for any post-build axis modifications. Do not manually call `buildSubplotAxes` + `composeChartOption` in individual builders.
- Every exported series builder in `series/` must return `SeriesBuildResult` (`{ series, legendData }`), including single-series builders such as heatmap and histogram.
- `legendData` must only contain names for traces that actually produced series entries.
- Series builders own axis bindings (`xAxisIndex`, `yAxisIndex`). Chart builders should not remap axis indices after receiving `result.series`.
- All series must use structured IDs via `utils/seriesId.ts`. Never hardcode series ID strings.
- When changing a shared API, update all affected modules rather than preserving backwards compatibility. Do not add optional parameters or fallback paths to avoid breaking callers.

## Types

- Place shared types in `types.ts`. Keep builder-internal types in the builder file.
- Avoid `any`. Use `unknown` only at system boundaries, not for internal code.
- Prefer `type` over `interface` unless declaration merging is needed.

## Utils

- Pure calculation functions belong in `utils/`, not in builders or series files.
- Every function in `utils/` must have a unit test in `tests/unit/eCharts/`.
- When adding or changing a util, update or add the corresponding test.

## Tooltips

- All tooltip formatters live in `interaction/tooltipFormatters.ts`. Do not inline formatters in builders.

## Statistical Overlays

- Each chart type has one job. Do not overlay point statistics (P10/Mean/P90) on shape-focused plots (Histogram, Density/KDE). Use the Percentile Range chart to show distribution statistics instead.

## ECharts API Workflow

- Before implementing a visual feature, verify that the ECharts API supports the intended behavior for the specific series type and configuration in use. If a feature requires runtime experimentation to validate (e.g., tooltip triggers, hover targets, custom bindable events), implement one isolated proof-of-concept change first. Do not chain multiple speculative API usages in a single commit.

## Testing

- Run `npx vitest run tests/unit/eCharts/` after changes to utils.
- Run `npx tsc --noEmit` and `npx eslint src/modules/_shared/eCharts/` before finishing.
- Tests should be concise: edge cases, known-value correctness, structural invariants.

## Documentation

- Keep `README.md` in this folder up to date when adding builders, utils, or conventions.
- Keep the Folder Map section accurate.
