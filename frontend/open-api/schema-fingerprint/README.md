# Schema fingerprint (`_schema` query parameter)

Every generated SDK function for a **browser-cached GET** endpoint sends a constant `_schema=<16 hex chars>` query
parameter. The value is a fingerprint of that endpoint's success-response schema (2xx and `default`) and its
optional [result version](#result-version), computed when the SDK is generated.

```ts
// src/api/autogen/sdk.gen.ts (generated)
export const getCases = <ThrowOnError extends boolean = false>(options: Options<GetCasesData_api, ThrowOnError>) =>
    (options.client ?? client).get<GetCasesResponses_api, GetCasesErrors_api, ThrowOnError>({
        responseType: "json",
        url: "/cases",
        ...options,
        query: { ...options.query, _schema: "3f9a0c1b7d2e4a65" },
    });
```

## Why

Some endpoints let the browser cache their responses for up to two weeks (`@cache_time` in
`backend_py/primary/primary/middleware/cache_control_middleware.py`). After a deploy that changes a response
model, the browser could keep serving a body with the old shape, which the new frontend code can't handle.

The browser cache is keyed by URL. When a response schema changes, regenerating the SDK changes that endpoint's
`_schema`, and so its URL, so the old cached response is never used. Endpoints whose schema didn't change keep
their URL and their cache. The same goes for a change to the values an endpoint returns, once the backend bumps
its `result_version`.

This is independent of `zCacheBust` (`../cachebusting-plugin`), which busts caches when _ensemble data_ changes.

- No runtime cost: the value is a string constant in the generated code.
- Callers don't see it: the generated function signatures and types are unchanged, and a caller-supplied
  `query._schema` is overwritten.
- The backend ignores it, like any undeclared query parameter.
- Only endpoints the backend marks as browser-cached get it (see [Which endpoints](#which-endpoints)).

## Which endpoints

`@cache_time` and `@custom_cache_time` mark their endpoint with `x-browser-cached: true` in its OpenAPI
operation (`add_cache_info_to_openapi()` in `cache_control_middleware.py`). Only GET operations with that marker get
`_schema`. Other endpoints respond with `Cache-Control: no-store`, so there is no cached body to bust.

- The marker isn't part of the fingerprint, so adding it doesn't change an endpoint's `_schema`.
- Generation fails if a non-GET operation has the marker (browsers don't HTTP-cache other methods, so the backend's
  caching setup is wrong), or if its value isn't `true`.
- Endpoints that opt in at runtime with `set_cache_time()` have no decorator, so they're **not** marked and get no
  `_schema`. Currently that's `GET /surface/statistical_surface_data_hybrid`.

## How the fingerprint is computed

[`fingerprint.ts`](fingerprint.ts), `fingerprintResponse(operation, document)`:

1. Take the operation's 2xx and `default` responses from the OpenAPI document as they are (status codes, media
   types, schemas). `default` is included because it covers every status not declared otherwise, including an
   undeclared 2xx.
2. Collect every `$ref` reachable from them, transitively (`#/components/schemas/...`,
   `#/components/responses/...`).
3. Take the operation's `x-result-version`, if it has one (see [Result version](#result-version)).
4. Serialize `{ responses, references, resultVersion? }` as canonical JSON
   ([RFC 8785](https://www.rfc-editor.org/rfc/rfc8785), via the `canonicalize` package). Object keys are sorted,
   so property order doesn't matter. `resultVersion` is left out entirely when the operation has none.
5. Hash `FINGERPRINT_ALGORITHM + "\n" + <canonical JSON>` with SHA-256 and keep the first 16 hex characters.

**Changes the fingerprint:** anything in those responses or the schemas they reference, including field
additions, removals, type changes, `required`, enum values, nested schemas, status codes and media types.
Documentation changes (descriptions, examples) and schema renames also change it. That is deliberate:
ignoring them would need a schema-aware normalizer, and the cost is only one extra cache miss. Adding or
bumping `x-result-version` also changes it.

**Doesn't change it:** other explicitly declared non-2xx responses (e.g. `422`), request parameters and bodies,
other endpoints, and components the endpoint doesn't reference.

**Warnings at generation time** (printed as `[schema-fingerprint] ...`):

- A 2xx or `default` response whose schema is missing or empty (`{}`). Its body shape can't be fingerprinted.
  Currently expected for `GET /login` and `GET /auth-callback`, which are never cached.
- An operation without any 2xx or `default` response.

**Errors:** unresolvable or non-local (`other.json#/...`) `$ref`s fail generation, as does an
`x-result-version` that isn't a positive integer.

If you change what goes into the hash, bump `FINGERPRINT_ALGORITHM`. That changes every fingerprint once, on
purpose. The exception is an optional input that's left out of the hashed JSON when absent, like
`resultVersion`: endpoints without it hash exactly the same input as before, so their fingerprints don't change.
Don't bump in that case, because a bump would invalidate every endpoint's browser cache for no reason.

## Result version

A bug fix or algorithm change can change the values an endpoint returns without changing its response schema.
The fingerprint can't see that, so the backend declares it instead:

```python
@router.get("/realization_surfaces_metadata/")
@cache_time(CacheTime.LONG, result_version=2)
async def get_realization_surfaces_metadata(...): ...
```

`result_version` (on `@cache_time` and `@custom_cache_time`) is published as `x-result-version` in the
endpoint's OpenAPI operation, and the fingerprint includes it. Bumping it changes only that endpoint's
`_schema`, in the same PR as the fix, and the regenerated SDK shows the change. It must be a positive integer:
the backend raises at import time otherwise (including for `bool` and `float` values).

- Bump it for bug fixes, algorithm changes, and changes to units, filtering or defaults. That includes changes
  in converters and in service or utility functions the endpoint calls. A fix in a shared helper needs a bump on
  every cached endpoint that uses it.
- Don't bump it for response schema changes (the fingerprint already covers them) or for refactors with
  identical output.
- Endpoints without `result_version` have no `x-result-version`, and their fingerprints are the same as before
  the field existed.
- It only busts the browser cache. Results cached on the server (Redis, Sumo task results) need their own
  handling.
- Endpoints that opt in at runtime with `set_cache_time()` can't declare it, because it isn't a decorator.

## How it hooks into hey-api

hey-api's SDK generator (`@hey-api/sdk`) has **no public extension point for the request options** of a
generated function. The plugin combines public hooks with a small, guarded use of hey-api internals.

```ts
// openapi-ts.config.ts
{ name: "@hey-api/sdk", $hooks: { events: makeSchemaFingerprintEvents() } }
```

[`inject-schema-query.ts`](inject-schema-query.ts) registers three `@hey-api/sdk` event hooks:

| Hook                    | Public? | What we do                                                                      |
| ----------------------- | ------- | ------------------------------------------------------------------------------- |
| `plugin:handler:before` | yes     | reset per-run state                                                             |
| `node:set:before`       | yes     | receives each finished SDK function (not yet rendered); we add the `query` prop |
| `plugin:handler:after`  | yes     | fail if any eligible operation never passed through `node:set:before`           |

Inside `node:set:before`, finding the `{ responseType, url, ...options }` object means walking hey-api's
**internal** code-builder ("ts-dsl") tree. These fields are `protected` or undeclared in hey-api's typings:

```
VarTsDsl                         export const getCases = ...           node.name.symbol.meta: public
  .value          (protected)    FuncTsDsl  <ThrowOnError>(options) => ...
    ._params      (undeclared)   [ParamTsDsl "options" (._optional)]
    ._do          (public)       [..., ReturnTsDsl]
      ._returnExpr (protected)   { "~ref": CallTsDsl }   (options.client ?? client).get(...)
        ._args    (undeclared)   [{ "~ref": ObjectTsDsl }]   { responseType, url, ...options }
          ._props (protected)    Map<"prop:url" | "spread:0" | ..., ObjectPropTsDsl>
```

The value is added with the public `$` builder (`$.object().spread(...).prop(...)`) and `ObjectTsDsl.prop()`.
It goes after `...options`, so it takes precedence.

If the operation declares no query parameters, `options.query` is typed `never` and can't be spread, so we emit
`query: { _schema: "..." }` without it. In practice every operation currently has `zCacheBust`.

Which operations are eligible is decided by an `isEligible` predicate passed to `makeInjectSchemaQueryEvents`
(see [Which endpoints](#which-endpoints)); the `plugin:handler:after` check uses the same predicate.

The operation's spec entry is found via `node.name.symbol.meta.path` (`["paths", "/cases", "get"]`) in
`plugin.context.spec`.

### Safety nets

So that a hey-api change can't silently drop `_schema`:

1. **Every step of the walk asserts the expected shape** and throws `SchemaQueryInjectionError`, naming the
   operation and what was found instead.
2. **The `plugin:handler:after` check** fails generation if any browser-cached GET operation didn't get the
   parameter. This
   catches hey-api no longer routing SDK functions through `node:set:before` at all, for example a different
   SDK layout (`operations.container: "class"`) or a refactored handler.
3. **Unit tests** ([`tests/unit/SchemaFingerprint.test.ts`](../../tests/unit/SchemaFingerprint.test.ts),
   [`tests/unit/SchemaFingerprintSdk.test.ts`](../../tests/unit/SchemaFingerprintSdk.test.ts)) generate an
   SDK from a fixture spec with the installed hey-api. They then check the output compiles, exactly the
   browser-cached GETs send `_schema`, serialization of other params is unchanged, and error handling still works.

Known unsupported configurations, each of which fails loudly: `paramsStructure: "flat"`, a class-based SDK, an
operation that already declares a `_schema` query parameter.

## When it breaks after a hey-api upgrade

`@hey-api/openapi-ts` doesn't follow semver (see the note in `package.json`), and the internals above can
change in any minor release. Typical symptom when running `npm run generate:api` or the unit tests:

```
SchemaQueryInjectionError: [schema-fingerprint] Cannot inject query parameter into GET /cases (getCases):
expected ObjectTsDsl in the client call, found undefined. This usually means a @hey-api/openapi-ts upgrade ...
```

or, from the safety net:

```
... into SDK: 72 eligible operation(s) were never seen by the node:set:before hook: GET /cases (getCases), ...
```

### Fixing it

1. **Look at how the new version builds the request options.** Search hey-api's bundled source:

    ```sh
    grep -n "function operationStatements\|reqOptions" node_modules/@hey-api/openapi-ts/dist/*.mjs
    ```

    In 0.99 it's `operationStatements()` in `dist/init-*.mjs` (the file name hash changes per release):
    `const reqOptions = $.object()`, `reqOptions.prop("url", ...)`, `reqOptions.spread("options")`, and finally
    `$.return(clientExpression.attr(method).call(reqOptions))`. Also look at the SDK handler
    (`handlerV1` / `toNode` in `src/plugins/@hey-api/sdk/v1/`) to see what's passed to `plugin.node(...)`.

2. **Check whether hey-api now has a proper hook.** Search the release notes and
   [issue #3446](https://github.com/hey-api/hey-api/issues/3446) for SDK "resolvers" or a request-options
   hook. If one exists, replace `injectQueryParameter()` with it and delete the internal walk. That's the
   intended long-term fix.

3. **Otherwise, dump the node** that `node:set:before` receives for one operation. Temporarily add this to
   `makeInjectSchemaQueryEvents` in `inject-schema-query.ts`:

    ```ts
    "node:set:before": ({ node, plugin }) => {
        if (node?.name.symbol?.meta?.resourceId === "getCases") {
            console.dir(node, { depth: 6 });
        }
        // ...existing code
    },
    ```

    Then update the internal shapes and the walk in `injectQueryParameter()` (the commented diagram at the
    bottom of `inject-schema-query.ts` lists the expected path). Keep the assertions.

4. **Verify:**

    ```sh
    npx vitest run tests/unit/SchemaFingerprint.test.ts tests/unit/SchemaFingerprintSdk.test.ts
    npm run generate:api    # backend running on :5000
    git diff src/api/autogen/sdk.gen.ts   # only the expected changes; every browser-cached GET still has `_schema`
    npm run typecheck
    ```

### If you need to ship before it's fixed

Remove the `$hooks` entry from the `@hey-api/sdk` plugin in `openapi-ts.config.ts` and regenerate. The SDK
then generates without `_schema`. Be aware that browsers can then serve responses cached under an old
response schema for up to their `max-age` (two weeks for `CacheTime.LONG`) after a deploy that changes that
schema. Restore it before the next release that changes cached response models.

## Limitations

- A backend change that alters what an endpoint returns without changing its schema (semantics, units,
  filtering) only changes `_schema` if the author bumps `result_version`. Nothing checks that automatically.
- Endpoints with an empty response schema can't be fingerprinted meaningfully (see warnings above).
- TanStack Query keys don't include `_schema`. That's fine: its in-memory cache doesn't survive the page reload
  that loads a new frontend build.
- `_schema` is only a client-side marker, and the backend doesn't check it. During a rolling deploy, the new
  frontend can be served while some `/api` requests still reach old backend replicas. A request in that window
  gets the old response shape under the new `_schema` URL, and the browser can cache it for up to two weeks.
  This only affects requests made during the rollout, and deploys mostly happen overnight. If it shows up in
  practice, the fix is on the backend: the frontend sends its build commit in a header, and the backend marks
  responses `Cache-Control: no-store` when that commit doesn't match its own.
