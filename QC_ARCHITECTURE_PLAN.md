# Framework-level QC (Quality Control) registry — implementation plan

## Context

The `ModelQc` module (`frontend/src/modules/ModelQc/`) currently has one fully-implemented check (Hydrostatic Equilibrium, split presentationally into a "vector check" and a "grid check") hardcoded directly into its view, plus three stubbed placeholders ("Observation coverage", "Well log qc", "Facies distribution") that were never implemented. Adding a new check today means writing a bespoke query hook, a bespoke status-derivation function, and bespoke JSX inside the module.

The goal is to turn QC into a first-class framework capability: for each ensemble there is a `EnsembleQc` object instance; checks implement a common interface and register themselves at a top-level `QcCheckRegistry`; every `EnsembleQc` instance automatically knows about all registered checks; and the user can run any check independently of the others. This replaces `ModelQc`'s ad-hoc approach — the module becomes a thin, generic consumer of the new framework infrastructure rather than owning check logic itself. The existing `frontend/src/framework/internal/QC/qc` file is an empty stray placeholder (confirmed via `git status`, untracked, 0 bytes) and will be deleted as part of this work — it is not real code to build on.

Backend endpoints (`backend_py/primary/primary/routers/qc/router.py`, the two hybrid-LRO hydrostatic equilibrium endpoints) are unchanged; this is a frontend architecture change only.

## Key architectural finding

`wrapLongRunningQuery()` (`frontend/src/framework/utils/lro/longRunningApiCalls.ts:38`) does **not** return a React hook — it returns a plain `UseQueryOptions` object whose `queryFn` is an ordinary `async` function (submit → detect `LroInProgressResp` → poll → resolve/throw). `useQuery()` is just react-query's hook-based *consumer* of that options object elsewhere in the codebase. The imperative, Promise-returning way to drive the same logic outside of React (from a plain class method) is:

```ts
await queryClient.fetchQuery({ ...wrapLongRunningQuery({ queryFn, queryFnArgs, queryKey, ... }), signal });
```

`fetchQuery` is a plain `QueryClient` method — no new polling machinery needs to be built. Progress reporting is similarly hook-free underneath: `useLroProgress` is a thin wrapper around `lroProgressBus` (`frontend/src/framework/LroProgressBus.ts`), whose `subscribe`/`getLast`/`publish` are plain callback-based methods a check's `run()` can call directly.

## Design

### 1. `CustomQcCheckImplementation` interface

New: `frontend/src/framework/internal/QC/interfacesAndTypes/customQcCheckImplementation.ts`

```ts
export type QcRealizationOutcome<TMetrics> =
    | { kind: "success"; metrics: TMetrics }
    | { kind: "error"; errorMessage: string };

export type QcCheckRunContext<TMetrics, TParams> = {
    ensemble: RegularEnsemble;
    realizations: readonly number[];   // caller-supplied, not re-derived by the check (see EnsembleQc.runCheck)
    params: TParams;
    queryClient: QueryClient;
    signal: AbortSignal;
    setProgressMessage: (message: string | null) => void;
    reportRealizationResult: (realization: number, outcome: QcRealizationOutcome<TMetrics>) => void;
};

export interface CustomQcCheckImplementation<TMetrics = unknown, TParams = void> {
    run(context: QcCheckRunContext<TMetrics, TParams>): Promise<void>;

    // Pure, no network. Called after each realization's metrics arrive, and again whenever params
    // change (e.g. threshold edits) — recomputes verdicts instantly without a re-fetch.
    deriveStatus(metrics: TMetrics, params: TParams): QcCheckStatus;

    defaultParams: TParams;

    rescheduleRealizations?(context: QcCheckRunContext<TMetrics, TParams>): Promise<void>;

    // Optional check-specific drill-down UI. The common contract (below) must already be sufficient
    // for the generic matrix/summary on its own — this is additive, not required.
    renderDetails?(props: QcCheckDetailsRenderProps<TMetrics, TParams>): React.ReactNode;
}
```

### 2. Shared structured result contract

New: `frontend/src/framework/internal/QC/interfacesAndTypes/qcCheckResult.ts`

- `QcCheckStatus` enum + `QcCheckStatusToStringMapping` / `QcCheckStatusToColorClassMapping` — ported verbatim from `frontend/src/modules/ModelQc/typesAndEnums.ts`.
- `QcRealizationResult<TMetrics>`: `{ realization, status, metrics: TMetrics | null, errorMessage: string | null }`.
- `QcCheckResult<TMetrics>`: `{ checkId, realizationResults: ReadonlyMap<number, QcRealizationResult<TMetrics>>, counts: StatusCounts, tone: Tone, isRunning, progressMessage, lastRunError, lastRunStartedAt, lastRunFinishedAt }`.
- `StatusCounts`: `{ passed, failed, notEvaluated, total }`.

New: `frontend/src/framework/internal/QC/utils/qcStatusCounts.ts` — the generic half of the existing `frontend/src/modules/ModelQc/view/utils/statusCounts.ts` (`computeStatusCounts`, `mergeCounts`, `toneFromCounts`, `computeSectionTone`), relocated unchanged in logic. The check-specific half (`isGridPropertyWithinThreshold`, `computeGridRealizationStatus`, `computeVectorRealizationStatus`) becomes internal helpers inside each check implementation's `deriveStatus`, since only the check knows its metric shape.

### 3. `QcCheckRegistry`

Mirrors `DataProviderRegistry` (`frontend/src/modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry/_DataProviderRegistry.ts`) exactly: private-static class, `Map` storage of `{ descriptor, implementationClass, ctorParams? }`, `registerCheck()` throws on duplicate id, `makeCheckImplementation()` instantiates on demand, `getRegisteredChecks()` returns descriptors for discovery.

- `frontend/src/framework/internal/QC/QcCheckRegistry/_QcCheckRegistry.ts` — the class. `QcCheckDescriptor = { checkId, label, groupId?, groupLabel?, description? }` (the optional `groupId`/`groupLabel` let presentationally-related checks like the two hydrostatic-equilibrium checks roll up under one section header without coupling the checks themselves).
- `frontend/src/framework/internal/QC/QcCheckRegistry/index.ts` — re-exports the class and does `import "./_registerAllQcChecks"` for its side effects (matches `DataProviderRegistry/index.ts`'s convention).
- `frontend/src/framework/internal/QC/QcCheckRegistry/_registerAllQcChecks.ts` — one `QcCheckRegistry.registerCheck(...)` call per implementation.
- `frontend/src/framework/internal/QC/qcCheckTypes.ts` — `QcCheckType` string enum of check ids (mirrors `DataProviderType`).

### 4. `EnsembleQc` — one instance per ensemble

New: `frontend/src/framework/internal/QC/EnsembleQc.ts`. Implements `PublishSubscribe<EnsembleQcTopicPayloads>` (same `PublishSubscribeDelegate` from `@lib/utils/PublishSubscribeDelegate` used by `DataProviderManager` and `PrivateWorkbenchSession`), with a single topic `EnsembleQcTopic.RESULTS` that fires whenever any check's status/progress/counts change.

Holds `_resultsByCheckId: Map<string, QcCheckResult>`, `_paramsByCheckId`, `_abortControllersByCheckId`. Public API:
- `getAvailableChecks(): QcCheckDescriptor[]` — delegates to `QcCheckRegistry.getRegisteredChecks()`, so every instance automatically knows about all registered checks with zero per-ensemble wiring.
- `getCheckResult(checkId)` / `getAllCheckResults()`.
- `async runCheck(checkId, { realizations, params? })` — cancels any in-flight run for that check id, instantiates the implementation via `QcCheckRegistry.makeCheckImplementation(checkId)`, marks requested realizations `NOT_EVALUATED_PENDING`, calls `impl.run(context)` with `reportRealizationResult`/`setProgressMessage` callbacks that update internal state and notify `RESULTS` incrementally as results stream in. This directly satisfies "run checks independently" — each check id runs and is cancelled independently of every other.
- `async runAllChecks(realizations)` — `Promise.allSettled` over `runCheck` for every registered check.
- `setCheckParams(checkId, params)` — pure re-derivation of statuses over already-fetched metrics via `impl.deriveStatus`, no network call (this is what makes a threshold edit instant).
- `cancelCheck(checkId)`.

**Scope decision — regular ensembles only.** `EnsembleQc` takes a `RegularEnsemble`. `DeltaEnsembleIdent` has no `caseUuid`/`ensembleName`, and every current/near-future check needs a Sumo case+ensemble to query; delta-ensemble QC is out of scope and `EnsembleQcSet` (below) simply never creates an entry for delta ensembles.

**Scope decision — realizations passed in, not self-derived.** `runCheck()` takes `realizations` as a caller argument rather than reading `RealizationFilterSet` itself, keeping `EnsembleQc` decoupled/testable. The view computes it the same way `ModelQc` already does today via `useEnsembleRealizationFilterFunc(workbenchSession)`.

### 5. `PrivateWorkbenchSession` integration (ownership/lifecycle)

New: `frontend/src/framework/internal/QC/EnsembleQcSet.ts` — mirrors `RealizationFilterSet.synchronizeWithEnsembleSet()` (`frontend/src/framework/RealizationFilterSet.ts:17-44`) exactly: removes `EnsembleQc` entries for idents no longer in the `EnsembleSet` (disposing/aborting their in-flight runs first), adds new entries for new regular ensembles, and **leaves existing entries untouched** so accumulated results survive an unrelated `setEnsembleSet()` call (e.g. adding a second ensemble doesn't wipe out QC results already computed for the first).

Touch points in `frontend/src/framework/internal/WorkbenchSession/PrivateWorkbenchSession.ts`:
- Constructor: `this._ensembleQcSet = new EnsembleQcSet();`
- `setEnsembleSet()` (line 281): after `this._ensembleSet = set;`, add `this._ensembleQcSet.synchronizeWithEnsembleSet(set, this._queryClient);` and notify a new `WorkbenchSessionTopic.ENSEMBLE_QC_SET`, alongside the existing `REALIZATION_FILTER_SET` notify on lines 286-287 (same pattern).
- `clear()` (line 419): add `this._ensembleQcSet.clear()`.
- `deserializeContentState()` (line 228): no new call needed — it already calls `this.setEnsembleSet(newSet)` (line 261), which transitively synchronizes QC, preserving the existing "ensembles must be loaded before dashboards/modules deserialize" ordering (comment at lines 234-236).
- New getter `getEnsembleQcSet(): EnsembleQcSet`.
- `makeSnapshotGetter()` (line 299): add the `ENSEMBLE_QC_SET` case.
- `WorkbenchSessionTopicPayloads` (line 69, in this same file): add `[WorkbenchSessionTopic.ENSEMBLE_QC_SET]: EnsembleQcSet;`.

**No serialization needed** — QC results are ephemeral/re-runnable (same as react-query cache data), so `serializeContentState()`/`SerializedWorkbenchSessionContentState` are untouched.

`frontend/src/framework/WorkbenchSession.ts` changes:
- `WorkbenchSessionTopic` enum (line 12): add `ENSEMBLE_QC_SET = "EnsembleQcSet"`.
- `WorkbenchSession` interface (line 17): add `getEnsembleQcSet: () => EnsembleQcSet;`.
- New hooks mirroring `useEnsembleSet` (line 24):
  ```ts
  export function useEnsembleQcSet(workbenchSession: WorkbenchSession): EnsembleQcSet { ... }
  export function useEnsembleQc(workbenchSession: WorkbenchSession, ensembleIdent: RegularEnsembleIdent | null): EnsembleQc | null { ... }
  ```
  A component that needs to re-render as results stream in additionally subscribes to the instance's own topic: `usePublishSubscribeTopicValue(ensembleQc, EnsembleQcTopic.RESULTS)`.

### 6. Hydrostatic equilibrium migration

Split into **two separately-registered checks** — `QcCheckType.HYDROSTATIC_EQUILIBRIUM_VECTOR` and `QcCheckType.HYDROSTATIC_EQUILIBRIUM_GRID_PROPERTY` — grouped presentationally via `groupId: "hydrostatic-equilibrium"`. Evidence: in the current code (`frontend/src/modules/ModelQc/view/checks/HydrostaticEquilibriumCheck.tsx`, `useVectorCheckQuery.ts`, `useGridPropertyCheckQueries.ts`) they already have fully independent query objects, loading/error states, progress text, and reschedule actions — the only coupling today is presentational (one shared collapsible header), which the registry's `groupId`/`groupLabel` reproduces without coupling the check implementations themselves.

New: `frontend/src/framework/internal/QC/implementations/hydrostaticEquilibrium/`
- `types.ts` — `VectorMetrics`, `GridMetrics`, `VectorCheckParams`, `GridCheckParams`.
- `HydrostaticEquilibriumVectorCheck.ts` — `run()` replaces `useVectorCheckQuery.ts`: builds `apiArgs`/`queryKey`, subscribes to `lroProgressBus` for progress, calls `queryClient.fetchQuery(wrapLongRunningQuery(...))`, reports each realization's outcome via `reportRealizationResult`. `deriveStatus()` ports `computeVectorRealizationStatus` from the current `statusCounts.ts`.
- `HydrostaticEquilibriumGridPropertyCheck.ts` — `run()` replaces `useGridPropertyCheckQueries.ts`: fires one `fetchQuery` per realization in parallel (`Promise.allSettled`), reporting each as it resolves — the imperative equivalent of the current `useQueries` streaming behavior. `deriveStatus()` ports `computeGridRealizationStatus`/`isGridPropertyWithinThreshold`. `rescheduleRealizations()` ports the existing reschedule logic (delete-task request + `queryClient.resetQueries`).
- `renderDetails()` on each takes over the presentational role of the current `GridCheckResult.tsx`/`VectorCheckResult.tsx` (moved from `modules/ModelQc/view/components/` into this folder, adapted to read from `QcCheckResult<TMetrics>` instead of raw API types).

Backend is untouched — same two endpoints, same params, same response shapes.

### 7. `ModelQc` module becomes a generic consumer

Keep the registered module name `"ModelQc"` (renaming risks breaking persisted dashboards that reference it by string) — only its internals change:

- `interfaces.ts` — trims to just `ensembleIdent`; check-specific config (grid name, threshold, time steps) stays module-owned in `settings/atoms/` but is assembled into each check's `params` at the call site when the user clicks "Run", not threaded through the settings→view interface.
- `view/view.tsx` — becomes generic: `useEnsembleQc(workbenchSession, ensembleIdent)`, subscribe to `EnsembleQcTopic.RESULTS`, group `ensembleQc.getAvailableChecks()` by `groupId`, render one `QcCheckSection` per group.
- New `view/components/QcCheckSection.tsx` — generic collapsible section: header with tone from `mergeCounts`+`toneFromCounts`, a `StatusCountSummary`, a "Run" button calling `ensembleQc.runCheck(checkId, { realizations, params })`, the generalized `RealizationStatusMatrix` fed from `QcCheckResult.realizationResults`, and the check's `renderDetails()` if present.
- `RealizationStatusMatrix.tsx`, `StatusCountSummary.tsx`, `StatusBadge.tsx`, `PassFailIndicator.tsx` stay in `modules/ModelQc/view/components/` (only their `QcCheckStatus` import path changes) — no forced relocation, since `ModelQc` remains the sole consumer for now.
- `settings/settings.tsx` — unchanged in spirit (ensemble picker, grid-name combobox, threshold input); only type imports move.

**Delete** (superseded by the framework version): `modules/ModelQc/typesAndEnums.ts`, `modules/ModelQc/view/utils/statusCounts.ts`, `modules/ModelQc/view/checks/` (entire folder: `HydrostaticEquilibriumCheck.tsx`, `useVectorCheckQuery.ts`, `useGridPropertyCheckQueries.ts`), `modules/ModelQc/view/components/GridCheckResult.tsx` + `VectorCheckResult.tsx` (logic ported into `renderDetails()`), and the stray `frontend/src/framework/internal/QC/qc` placeholder file.

The three previously-stubbed checks (Observation coverage, Well log qc, Facies distribution) are **not implemented now** — dropping their hardcoded JSX placeholders and leaving them for a future `registerCheck()` call is itself the concrete proof the new architecture makes adding a check trivial (implement `CustomQcCheckImplementation`, register it — no view/settings changes required).

## Files

**Create**
- `frontend/src/framework/internal/QC/interfacesAndTypes/qcCheckResult.ts`
- `frontend/src/framework/internal/QC/interfacesAndTypes/customQcCheckImplementation.ts`
- `frontend/src/framework/internal/QC/qcCheckTypes.ts`
- `frontend/src/framework/internal/QC/utils/qcStatusCounts.ts`
- `frontend/src/framework/internal/QC/QcCheckRegistry/{_QcCheckRegistry.ts, _registerAllQcChecks.ts, index.ts}`
- `frontend/src/framework/internal/QC/EnsembleQc.ts`
- `frontend/src/framework/internal/QC/EnsembleQcSet.ts`
- `frontend/src/framework/internal/QC/implementations/hydrostaticEquilibrium/{types.ts, HydrostaticEquilibriumVectorCheck.ts, HydrostaticEquilibriumGridPropertyCheck.ts}`
- `frontend/src/modules/ModelQc/view/components/QcCheckSection.tsx`
- Unit tests under `frontend/tests/unit/` (repo convention — confirmed via existing `frontend/tests/unit/EnsembleSet.test.ts`, not colocated): `qcStatusCounts.test.ts`, `EnsembleQc.test.ts`, `hydrostaticEquilibriumChecks.test.ts`

**Modify**
- `frontend/src/framework/internal/WorkbenchSession/PrivateWorkbenchSession.ts` (§5)
- `frontend/src/framework/WorkbenchSession.ts` (§5)
- `frontend/src/modules/ModelQc/interfaces.ts`, `view/view.tsx`, `settings/settings.tsx`
- `frontend/src/modules/ModelQc/view/components/{RealizationStatusMatrix,StatusCountSummary,StatusBadge,PassFailIndicator}.tsx` (import path updates only)

**Delete**
- `frontend/src/framework/internal/QC/qc`
- `frontend/src/modules/ModelQc/typesAndEnums.ts`
- `frontend/src/modules/ModelQc/view/utils/statusCounts.ts`
- `frontend/src/modules/ModelQc/view/checks/` (entire folder)
- `frontend/src/modules/ModelQc/view/components/{GridCheckResult,VectorCheckResult}.tsx`

## Implementation order

1. Framework core with zero real checks registered: types (§2), interface (§1), `QcCheckRegistry` (§3, empty registration file), `EnsembleQc`/`EnsembleQcSet` (§4/§5). Unit-test `qcStatusCounts.ts` and `EnsembleQc` against a hand-written fake `CustomQcCheckImplementation` (pending→success/error transitions, `setCheckParams` re-deriving without re-running, `cancelCheck` aborting).
2. Wire `PrivateWorkbenchSession`/`WorkbenchSession.ts` (§5). App should build and behave identically — `ModelQc` still uses its old code at this point — a safe, independently-verifiable checkpoint.
3. Port the two hydrostatic-equilibrium checks (§6) and register them; unit-test `deriveStatus` for both.
4. Rebuild `ModelQc`'s view/settings as a generic consumer (§7); delete obsolete files.

## Verification

- Unit tests (`qcStatusCounts`, `EnsembleQc` with fake check, `deriveStatus` for both hydrostatic checks) via the repo's `vitest run` (`test:unit` script).
- Manual: run the dev server, open a dashboard with the Model QC module, select an ensemble+grid with hydrostatic equilibrium data. Click "Run" on the vector check and the grid check independently — confirm each runs/streams/completes without triggering the other. Confirm the generic status matrix/summary render for both. Change the grid threshold and confirm status recomputes instantly with no new network request. Switch to a different ensemble and back — confirm previously-computed results are preserved (`EnsembleQcSet` reuse). Trigger a realization reschedule and confirm only that realization re-runs.
