# eCharts Shared Module — Agent Rules

## Code style

- Every exported series builder must return `SeriesBuildResult` (`{ series, legendData }`).
- Every series must set `itemStyle: { color: trace.color }` explicitly — ECharts palette fallback produces wrong legend swatches.
- Prefer named functions for non-trivial callbacks so stack traces stay readable.
- Callbacks with control flow (`if`/`for`/`switch`/`try`) or > 3 lines must be extracted to a named function.
- For callback-only APIs (`renderItem`, `formatter`, axis `min`/`max`), keep the callback thin and delegate to a named helper.
- Avoid `any`; use `unknown` only at boundaries.

## Terminology

- No domain-specific terms ("realization", "ensemble", "reservoir") in this module.
- Use **"member"** (not "realization") in labels, tooltips, comments, and new code.
- Axis label defaults ("Value", "Density", etc.) are overridable via `BaseChartOptions`.

## Architecture rules

- When shared APIs change, update all callers. No compatibility shims.
- Update the documentation: If you add a new chart family, modify the `BaseChartOptions` interface, or change a public API, you must update README.md to reflect the changes. The documentation is the source of truth for consumers.
- Pure calculations belong in `utils/` with tests in `tests/unit/eCharts/`.
- Public consumer imports use `@modules/_shared/eCharts`. Deep imports only inside the module.

## Validation

- `npx vitest run tests/unit/eCharts/`
- `npx tsc --noEmit`
