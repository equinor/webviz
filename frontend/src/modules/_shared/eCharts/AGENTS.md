# eCharts Shared Module - Agent Instructions

## Core Architecture

- All cartesian builders must go through `buildCartesianSubplotChart` in `builders/cartesianSubplotChartBuilder.ts`.
- Use `postProcessAxes` for post-build axis changes. Do not bypass the base pipeline.
- Put builder-specific configuration in a typed options object instead of adding extra positional builder arguments.
- Every exported series builder must return `SeriesBuildResult` (`{ series, legendData }`).
- `legendData` must only include traces that actually produced series entries.
- Series builders own `xAxisIndex` and `yAxisIndex`; chart builders must not remap them.
- Use structured IDs from `utils/seriesId.ts`. Never hardcode ID strings.
- Prefer chart-local ID wrappers (for example `ids.ts` inside a family/chart slice) over adding new direct callers to `utils/seriesId.ts`.
- When shared APIs change, update all callers. Do not add compatibility shims.

## Function Naming and Debuggability

- Prefer named functions for non-trivial callbacks so stack traces stay readable.
- Any callback with a block body that contains control flow (`if`/`for`/`switch`/`try`) or spans more than 3 logical lines must be extracted to a named function.
- In slice builders, do not inline larger callbacks into `buildCartesianSubplotChart`, `postProcessAxes`, or nested collection callbacks (`map`/`forEach`/`flatMap`) when they contain logic.
- One-expression passthrough callbacks may stay inline.
- For callback-only APIs (for example ECharts `renderItem`, tooltip `formatter`, axis `min`/`max` callbacks), keep the callback thin and delegate logic to a named helper function.

## Tooltip Ownership

- Global tooltip style is applied in `builders/composeChartOption.ts` via `buildCompactTooltipConfig`.
- Builder-level tooltip config owns chart-level trigger and axis pointer behavior.
- Series-level tooltip config is allowed only for item-specific metadata or helper-series suppression (`tooltip.show = false`), and should delegate to chart-family tooltip helpers.
- Chart-specific tooltip formatter implementations must live beside the owning family/chart slice.
- `interaction/tooltips/` is reserved for shared tooltip primitives only (`core.ts`, runtime helpers).
- Do not inline tooltip formatter logic in builders or series files.
- Do not re-export chart-specific tooltip helpers through `interaction/index.ts`.

## Types and Utils

- Put shared types in `types.ts`; family-local or chart-local types should live with the slice.
- Avoid `any`; use `unknown` only at boundaries.
- Pure calculations belong in `utils/` and must have tests in `tests/unit/eCharts/`.

## Plot Scope

- Do not overlay point statistics (P10/Mean/P90) on histogram or density charts.
- Use percentile range charts for distribution statistics.

## Validation

- Run `npx vitest run tests/unit/eCharts/`.
- Run `npx tsc --noEmit`.
- Run `npx eslint src/modules/_shared/eCharts/`.

## Documentation

- Keep `README.md` concise and aligned with implemented behavior.
