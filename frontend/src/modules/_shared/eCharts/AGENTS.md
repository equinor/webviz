# eCharts Shared Module - Agent Instructions

## Core Architecture

- All cartesian builders must go through `buildCartesianSubplotChart` in `builders/cartesianSubplotChartBuilder.ts`.
- Use `postProcessAxes` for post-build axis changes. Do not bypass the base pipeline.
- Every exported series builder in `series/` must return `SeriesBuildResult` (`{ series, legendData }`).
- `legendData` must only include traces that actually produced series entries.
- Series builders own `xAxisIndex` and `yAxisIndex`; chart builders must not remap them.
- Use structured IDs from `utils/seriesId.ts`. Never hardcode ID strings.
- When shared APIs change, update all callers. Do not add compatibility shims.

## Function Naming and Debuggability

- Prefer named functions for non-trivial callbacks so stack traces stay readable.
- Any callback with a block body that contains control flow (`if`/`for`/`switch`/`try`) or spans more than 3 logical lines must be extracted to a named function.
- In `builders/`, do not inline larger callbacks into `buildCartesianSubplotChart`, `postProcessAxes`, or nested collection callbacks (`map`/`forEach`/`flatMap`) when they contain logic.
- One-expression passthrough callbacks may stay inline.
- For callback-only APIs (for example ECharts `renderItem`, tooltip `formatter`, axis `min`/`max` callbacks), keep the callback thin and delegate logic to a named helper function.

## Tooltip Ownership

- Global tooltip style is applied in `builders/composeChartOption.ts` via `buildCompactTooltipConfig`.
- Builder-level tooltip config owns chart-level trigger and axis pointer behavior.
- Series-level tooltip config is allowed only for item-specific metadata or helper-series suppression (`tooltip.show = false`), and should delegate to chart-family tooltip helpers.
- Tooltip formatter implementations must live in `interaction/tooltips/<family>.ts` or `interaction/tooltips/core.ts`.
- Do not inline tooltip formatter logic in builders or series files.
- Re-export public tooltip formatters through `interaction/index.ts`.

## Types and Utils

- Put shared types in `types.ts`; keep file-local helper types local.
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
