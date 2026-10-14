---
applyTo: "backend_py/primary/**,backend_py/libs/**,backend_py/user_grid3d_ri/**,backend_go/**"
description: "Use when changing backend endpoint logic, converters, services, utils or internal services (user_grid3d_ri, backend_go surface_query) that affect the values returned by browser-cached endpoints."
---

# Result version for cached endpoints

Endpoints decorated with `@cache_time` or `@custom_cache_time` are cached by the browser potentially for a long time. The browser cache is only invalidated by the backend if the endpoint's response schema changes or when its `result_version` is added/bumped. See `backend_py/primary/primary/middleware/cache_control_middleware.py` and the "Result version" section of `frontend/open-api/schema-fingerprint/README.md`.

## Flag a missing result_version bump

Flag changes which alter the values a cached endpoint returns, without changing its response schema, and the endpoint's decorator has no added/bumped `result_version`. 

This applies to the endpoint body and everything it calls, directly or transitively: `routers/*/router.py`, `routers/*/converters.py` and other router helpers,
`primary/services/**`, `primary/utils/**` and `backend_py/libs/**`.

Result-changing examples include:

- Bug fixes in returned values
- Algorithm or formula changes
- Unit conversions
- Rounding, precision or dtype changes
- NaN / None / missing-data handling

## Internal services called by primary

Some primary endpoints get input over HTTP requests towards internal endpoints in other containers (e.g. `backend_py/user_grid3d_ri/**` and `backend_go/surface_query/**`). If such a service changes the values it returns for the same request, every cached primary endpoint that calls it needs a bump in `backend_py/primary`, even if the PR doesn't otherwise touch the primary backend.

## Expected fix

Add `result_version=1` to the decorator if it has none, otherwise increment it by exactly 1, e.g. `@cache_time(CacheTime.LONG, result_version=2)`.

## Do not flag

- Response schema changes only (the schema fingerprint already busts the cache).
- Refactors, renames, logging, typing, comments or performance work with identical output.
- Endpoints without `@cache_time` / `@custom_cache_time` (they are not browser-cached).
- Endpoints that opt in with `set_cache_time()` at runtime. They can't declare `result_version`; mention that a result change there may be served stale from the browser cache instead.

## Also flag

- A `result_version` that is lowered, reset or removed.
- A bump on an endpoint whose output did not change.

## Review comment format

Name the affected endpoint(s), the changed function, why the returned values change, and the suggested decorator line.
