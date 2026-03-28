# eCharts Shared Module - Agent Instructions

- Every exported series builder must return `SeriesBuildResult` (`{ series, legendData }`).
- When shared APIs change, update all callers. Do not add compatibility shims.
- Prefer named functions for non-trivial callbacks so stack traces stay readable.
- Any callback with a block body that contains control flow (`if`/`for`/`switch`/`try`) or spans more than 3 logical lines must be extracted to a named function.
- For callback-only APIs (for example ECharts `renderItem`, tooltip `formatter`, axis `min`/`max` callbacks), keep the callback thin and delegate logic to a named helper function.

- For public consumer imports, prefer `@modules/_shared/eCharts` when the symbol is exported from the root entrypoint.
- Use deep internal imports only inside the shared eCharts module itself or when a symbol is intentionally not part of the public root API.

- Avoid `any`; use `unknown` only at boundaries.
- Pure calculations belong in `utils/` and must have tests in `tests/unit/eCharts/`.

## Validation

- Run `npx vitest run tests/unit/eCharts/`.
- Run `npx tsc --noEmit`.
- Run `npx eslint src/modules/_shared/eCharts/`.

## Documentation

- Keep `README.md` concise and aligned with implemented behavior.
