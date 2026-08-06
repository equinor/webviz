# Framework-level QC registry + cross-module Selection service — design

## Context

Two related pieces of framework infrastructure, agreed through direct design discussion (not just exploration):

1. **QC registry**: `ModelQc` currently has one fully-implemented check (Hydrostatic Equilibrium, split presentationally into a "vector check" and a "grid check") hardcoded directly into its view, plus three stubbed placeholders never implemented. The goal: for each ensemble there is an `EnsembleQc` object instance; checks implement a common interface and register themselves at a top-level `QcCheckRegistry`; every `EnsembleQc` instance automatically knows about all registered checks; the user can run any check independently. This replaces `ModelQc`'s ad-hoc approach — the module becomes a thin, generic consumer of the framework infrastructure. The stray empty file `frontend/src/framework/internal/QC/qc` is dead and will be deleted.

2. **Selection service**: clicking a realization in a QC view (e.g. the status matrix) should select it globally, and other modules with their own "selected realization" concept (FlowNetwork, Vfp, WellCompletions today all have private, non-propagating local state for this) should automatically react — but only as a *revertible override*: the module's own original selection must be restorable, and the user needs a global overview of all active overrides as removable chips. No such cross-module override/revert mechanism exists today; the closest sibling is `HoverService` (ephemeral, not persistent, no revert semantics needed there since un-hovering naturally clears it).

Backend endpoints for QC (`backend_py/primary/primary/routers/qc/router.py`) are unchanged — this is a frontend architecture change only. Selection service is purely new frontend infrastructure.

---

## Part 1 — QC registry

### Key architectural finding

`wrapLongRunningQuery()` (`frontend/src/framework/utils/lro/longRunningApiCalls.ts:38`) returns a plain `UseQueryOptions` object with an ordinary `async` `queryFn` — not a hook. The codebase already has a ready-made, non-React way to drive TanStack Query imperatively from a plain class: **`ScopedQueryController`** (`frontend/src/lib/utils/ScopedQueryController.ts`), which wraps `QueryObserver` directly (no `useQuery`/`useQueries`), supports per-key cancellation, and is already used by `DataProvider` (`frontend/src/modules/_shared/DataProviderFramework/framework/DataProvider/DataProvider.ts`) — the closest existing sibling to what we're building: a per-instance object that fetches via TanStack imperatively and stores+publishes the resolved value itself (`this._data`, `DataProviderTopic.DATA`), which consumers read as props rather than by querying TanStack themselves. `EnsembleQc` follows the same pattern.

### 1. `QcCheck` interface

`frontend/src/framework/internal/QC/QcCheck.ts`:

```ts
export type QcCheckRealizationOutcome<TMetrics> =
    | { kind: "success"; metrics: TMetrics }
    | { kind: "error"; errorMessage: string };

export type QcCheckRunContext<TMetrics, TParams> = {
    ensemble: RegularEnsemble;
    realizations: readonly number[];
    params: TParams;
    fetchQuery: ScopedQueryController["fetchQuery"];
    setProgressMessage: (message: string | null) => void;
    reportRealizationResult: (realization: number, outcome: QcCheckRealizationOutcome<TMetrics>) => void;
};

export interface QcCheck<TMetrics = unknown, TParams = void> {
    defaultParams: TParams;
    run(context: QcCheckRunContext<TMetrics, TParams>): Promise<void>;
    deriveStatus(metrics: TMetrics, params: TParams): QcCheckStatus;
    renderDetails?(props: QcCheckDetailsRenderProps<TMetrics, TParams>): React.ReactNode;
}
```

Each check decides its own fetch granularity via `fetchQuery` (which is bound to that check's own `ScopedQueryController`, see §4): the grid check calls it once per realization (matches today's per-realization API shape); the vector check calls it once for a batch of realizations (matches today's single combined-response API shape, `HydrostaticVectorCheckResult.realization_results`) and then loops `reportRealizationResult` over the batch. `deriveStatus` is a pure function — ported directly from today's `computeGridRealizationStatus`/`computeVectorRealizationStatus`/`isGridPropertyWithinThreshold` in `frontend/src/modules/ModelQc/view/utils/statusCounts.ts`.

### 2. Shared result contract

`frontend/src/framework/internal/QC/interfacesAndTypes/qcCheckResult.ts`:

- `QcCheckStatus` enum + string/color mappings — ported verbatim from `frontend/src/modules/ModelQc/typesAndEnums.ts`.
- `QcRealizationResult<TMetrics> = { realization, status, metrics: TMetrics | null, errorMessage: string | null }`.
- `QcCheckRunState<TMetrics> = { isRunning, lastRunSelection: { realizations, params } | null, realizationResults: ReadonlyMap<number, QcRealizationResult<TMetrics>>, progressMessage: string | null }`.

`EnsembleQc` holds `metrics` alongside `status` in `realizationResults` (not discarded after deriving status) — this is what lets `setCheckParams()` (§4) do a genuine local recompute with zero network activity, and what lets a check's optional `renderDetails()` receive real data as a normal prop instead of needing its own `useQuery` subscription.

`frontend/src/framework/internal/QC/utils/qcStatusCounts.ts` — generic aggregation helpers ported unchanged from `frontend/src/modules/ModelQc/view/utils/statusCounts.ts`: `computeStatusCounts`, `mergeCounts`, `toneFromCounts`, `computeSectionTone`.

### 3. `QcCheckRegistry`

Static class, mirrors `DataProviderRegistry` (`frontend/src/modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry/_DataProviderRegistry.ts`) exactly: private-static `Map` storage of `{ descriptor, implementationClass, ctorParams? }`, `registerCheck()` throws on duplicate id, `makeCheckImplementation()` instantiates on demand, `getRegisteredChecks()` returns descriptors for discovery.

- `frontend/src/framework/internal/QC/QcCheckRegistry/_QcCheckRegistry.ts` — the class. `QcCheckDescriptor = { checkId, label, groupId?, groupLabel?, description? }` (optional `groupId`/`groupLabel` let related checks like the two hydrostatic-equilibrium checks roll up under one section header without coupling the check implementations).
- `frontend/src/framework/internal/QC/QcCheckRegistry/index.ts` — re-exports the class, does `import "./_registerAllQcChecks"` for side effects (matches `DataProviderRegistry/index.ts`).
- `frontend/src/framework/internal/QC/QcCheckRegistry/_registerAllQcChecks.ts` — one `registerCheck()` call per implementation.
- `frontend/src/framework/internal/QC/qcCheckTypes.ts` — `QcCheckType` string enum of check ids.

### 4. `EnsembleQc` — one instance per ensemble

`frontend/src/framework/internal/QC/EnsembleQc.ts`. Implements `PublishSubscribe<EnsembleQcTopicPayloads>` (same `PublishSubscribeDelegate` used by `DataProvider`/`PrivateWorkbenchSession`), topic `EnsembleQcTopic.RESULTS`.

Holds **one `ScopedQueryController` per check id**, created lazily on first run — this means cancelling one check's in-flight fetches (`cancelCheck`) never touches another check's, satisfying "run checks independently" for both execution and cancellation.

```ts
class EnsembleQc implements PublishSubscribe<EnsembleQcTopicPayloads> {
    getAvailableChecks(): QcCheckDescriptor[];                 // delegates to QcCheckRegistry — automatic discovery
    getCheckRunState(checkId: string): QcCheckRunState | null;
    getAllCheckRunStates(): ReadonlyMap<string, QcCheckRunState>;

    async runCheck(checkId: string, realizations: readonly number[], params?: unknown): Promise<void>;
    setCheckParams(checkId: string, params: unknown): void;    // pure local recompute over already-held metrics, no fetch
    cancelCheck(checkId: string): void;

    dispose(): void;   // cancels every check's controller — called by EnsembleQcSet on ensemble removal
}
```

`runCheck` marks requested realizations pending, calls `impl.run(context)` with the check's `ScopedQueryController.fetchQuery` bound in, and inside `reportRealizationResult` computes `deriveStatus` and stores `{status, metrics}` together, notifying `RESULTS` incrementally as results stream in. Re-running with the same realizations but changed params is the same call — `fetchQuery` serves from the TanStack cache when nothing changed on the network side.

**Scope decision — regular ensembles only.** `EnsembleQc` takes a `RegularEnsemble`; `DeltaEnsembleIdent` has no case/ensemble to query, and every current/near-future check needs one. `EnsembleQcSet` simply never creates an entry for delta ensembles.

### 5. `PrivateWorkbenchSession` integration

`frontend/src/framework/internal/QC/EnsembleQcSet.ts` — mirrors `RealizationFilterSet.synchronizeWithEnsembleSet()` (`frontend/src/framework/RealizationFilterSet.ts:17-44`): removes `EnsembleQc` entries for idents no longer in the `EnsembleSet` (disposing them first), adds entries for new regular ensembles, leaves existing entries untouched so results survive an unrelated `setEnsembleSet()` call.

Touch points in `frontend/src/framework/internal/WorkbenchSession/PrivateWorkbenchSession.ts`:
- Constructor: `this._ensembleQcSet = new EnsembleQcSet();`
- `setEnsembleSet()` (line 281): after `this._ensembleSet = set;`, add `this._ensembleQcSet.synchronizeWithEnsembleSet(set, this._queryClient);` and notify a new `WorkbenchSessionTopic.ENSEMBLE_QC_SET`, alongside the existing `REALIZATION_FILTER_SET` notify (lines 286-287).
- `clear()` (line 419): add `this._ensembleQcSet.clear()`.
- `deserializeContentState()` (line 228): no new call needed — already calls `setEnsembleSet(newSet)` (line 261), which transitively synchronizes QC.
- New getter `getEnsembleQcSet(): EnsembleQcSet`; `makeSnapshotGetter()` (line 299) gets a new case; `WorkbenchSessionTopicPayloads` (line 69, same file) gets `[WorkbenchSessionTopic.ENSEMBLE_QC_SET]: EnsembleQcSet`.

**No serialization needed** — QC results are ephemeral/re-runnable; `serializeContentState()` is untouched.

`frontend/src/framework/WorkbenchSession.ts`: add `WorkbenchSessionTopic.ENSEMBLE_QC_SET`, `WorkbenchSession.getEnsembleQcSet()`, and hooks `useEnsembleQcSet()`/`useEnsembleQc()` mirroring `useEnsembleSet` (line 24). A component also subscribes to the instance's own topic for streaming updates: `usePublishSubscribeTopicValue(ensembleQc, EnsembleQcTopic.RESULTS)`.

### 6. Hydrostatic equilibrium migration

Split into **two separately-registered checks** — `HYDROSTATIC_EQUILIBRIUM_VECTOR` and `HYDROSTATIC_EQUILIBRIUM_GRID_PROPERTY` — grouped presentationally via `groupId: "hydrostatic-equilibrium"`. They already have fully independent query objects, loading/error states, and reschedule actions today (`useVectorCheckQuery.ts` vs `useGridPropertyCheckQueries.ts`); the only coupling is presentational (one shared collapsible header), reproduced via `groupId`/`groupLabel` without coupling the implementations.

New: `frontend/src/framework/internal/QC/implementations/hydrostaticEquilibrium/{types.ts, HydrostaticEquilibriumVectorCheck.ts, HydrostaticEquilibriumGridPropertyCheck.ts}`. `renderDetails()` on each takes over the presentational role of today's `GridCheckResult.tsx`/`VectorCheckResult.tsx` (moved into this folder), now reading `metrics` directly from the `QcRealizationResult` prop instead of subscribing to anything themselves. Backend is untouched.

### 7. `ModelQc` becomes a generic consumer

Keep the registered module name `"ModelQc"` (renaming risks breaking persisted dashboards referencing it by string). `view/view.tsx` becomes generic: `useEnsembleQc(workbenchSession, ensembleIdent)`, subscribe to `EnsembleQcTopic.RESULTS`, group `getAvailableChecks()` by `groupId`, render one new `QcCheckSection.tsx` per group (generic collapsible: tone from `mergeCounts`+`toneFromCounts`, status-count summary, "Run" button calling `ensembleQc.runCheck(...)`, status matrix fed from `realizationResults`, `renderDetails()` if present). `RealizationStatusMatrix.tsx`/`StatusCountSummary.tsx`/`StatusBadge.tsx`/`PassFailIndicator.tsx` stay in place, only import paths change.

**Delete**: `modules/ModelQc/typesAndEnums.ts`, `modules/ModelQc/view/utils/statusCounts.ts`, `modules/ModelQc/view/checks/` (entire folder), `modules/ModelQc/view/components/{GridCheckResult,VectorCheckResult}.tsx` (ported into `renderDetails()`), the stray `frontend/src/framework/internal/QC/qc` file. The three previously-stubbed checks (Observation coverage, Well log qc, Facies distribution) are not implemented now — dropping their hardcoded placeholders is itself the proof the new architecture makes adding a check trivial later (implement `QcCheck`, register it, no view changes needed).

### QC implementation order

1. Framework core with zero real checks registered (§1-§5); unit-test `qcStatusCounts.ts` and `EnsembleQc` against a fake `QcCheck`.
2. Wire `PrivateWorkbenchSession`/`WorkbenchSession.ts` — app should build/behave identically, `ModelQc` still on old code (safe checkpoint).
3. Port the two hydrostatic-equilibrium checks and register them; unit-test `deriveStatus` for both.
4. Rebuild `ModelQc`'s view as a generic consumer; delete obsolete files.

---

## Part 2 — Cross-module Selection service

### Why, and the gap it fills

No cross-module "selected realization" (or similar) concept exists today — `FlowNetwork`, `Vfp`, and `WellCompletions` each keep their own private `selectedRealization*` jotai atom; `ModelQc`'s `RealizationStatusMatrix` keeps a plain local `useState`. Clicking a realization in one module currently affects nothing else. No override/revert mechanism exists anywhere in the codebase to build on — `persistableFixableAtom` (`frontend/src/framework/utils/atomUtils.ts`) was considered and ruled out: it's a strictly-forward self-healing-default pattern (recomputes a valid value when the current one becomes invalid), not an externally-imposed-value-with-revert pattern; its mechanics don't transfer.

`HoverService` (`frontend/src/framework/HoverService.ts`) is the structural template — singleton in `Workbench`, per-topic values via `PublishSubscribeDelegate` + `useSyncExternalStore` — but hover is ephemeral (unhovering naturally clears it) and needs no revert semantics, so only the plumbing carries over, not the value lifecycle.

### Design

**Revert is decentralized.** `SelectionService` cannot know each module's original value before an override — it doesn't know FlowNetwork's realization was `3` and Vfp's was `7`. So "remember original, restore on clear" lives in each *consuming* module's own hook instance, via a new framework-provided hook, not centrally in the service.

`frontend/src/framework/SelectionService.ts`:

```ts
export enum SelectionTopic {
    REALIZATION = "selection.realization",
    // extended later the same way HoverTopic grows
}
export type SelectionTopicPayloads = { [SelectionTopic.REALIZATION]: number | null };

class SelectionService implements PublishSubscribe<SelectionTopicPayloads> {
    setSelection<T extends SelectionTopic>(topic: T, value: SelectionTopicPayloads[T], sourceModuleInstanceId: string): void;
    clearSelection(topic: SelectionTopic): void;                 // triggers revert in every subscriber
    getSelection<T extends SelectionTopic>(topic: T): SelectionTopicPayloads[T];
    getActiveSelections(): { topic: SelectionTopic; value: unknown; sourceModuleInstanceId: string }[];  // feeds the chip overview
    getPublishSubscribeDelegate(): PublishSubscribeDelegate<SelectionTopicPayloads>;
}
```

Instantiated once in `Workbench.ts` alongside `_hoverService`, exposed via `getSelectionService()`. Unlike `hoverService` (view-only today), `selectionService` is added to **both** `ModuleViewProps` and `ModuleSettingsProps` (`frontend/src/framework/Module.tsx`), since consuming atoms like `selectedRealizationAtom` live in each module's `settings/atoms/`.

**Hooks** (`frontend/src/framework/SelectionService.ts`, mirroring `useHoverValue`/`usePublishHoverValue`/`useHover`):
- `useSelectionValue(topic, selectionService)` — read.
- `usePublishSelectionValue(topic, selectionService, moduleInstanceId)` — write.
- **`useSelectionOverride(topic, selectionService, [localValue, setLocalValue])`** — the revert-aware hook. While the topic holds a non-null value: remembers `localValue` once (on the transition into override), then forces `setLocalValue(overrideValue)` on every change. When the topic returns to null: restores the remembered value and forgets it. A module that wants to *react* to realization selection wraps its existing atom/state pair in this hook — one line, no bespoke revert logic per module.

**Chip overview**: reads `selectionService.getActiveSelections()`, renders one `Chip` (`frontend/src/lib/components/Chip/chip.tsx`, which already has a built-in `onRemove` "×") per active topic, `onRemove` → `selectionService.clearSelection(topic)`, cascading revert to every subscribed module via `useSelectionOverride`. Exact placement in the UI shell is deferred to implementation time — not blocking the service/hook contract.

**Connection point to Part 1**: the QC status matrix's realization-click handler (`RealizationStatusMatrix.tsx`, which currently only toggles local `useState`) calls `selectionService.setSelection(SelectionTopic.REALIZATION, realization, moduleInstanceId)` in addition to its own local toggle — this is the concrete trigger the user described ("clicking a realization should select it and modules should automatically react").

**Known follow-up, not blocking**: a module whose atom is wrapped in `useSelectionOverride` will have `setLocalValue` called with the override value, which — if that atom is a `persistableFixableAtom` — may get tagged `_source: USER` and get persisted/serialized while temporarily overridden. Whether this needs a new `Source` tag (e.g. `OVERRIDE`, excluded from serialization) is a decision for when `useSelectionOverride` is actually wired into a `persistableFixableAtom`-backed module; noted here so it isn't forgotten.

### Selection service implementation order

1. `SelectionService` + hooks, zero consumers wired up yet. Unit-test `useSelectionOverride`'s remember/restore transitions with a fake atom pair.
2. Wire into `Workbench.ts`/`ModuleViewProps`/`ModuleSettingsProps`.
3. Wire `RealizationStatusMatrix.tsx`'s click handler to `setSelection`.
4. Wire one consumer (e.g. `FlowNetwork`'s `selectedRealizationAtom`) through `useSelectionOverride` end-to-end as the reference example.
5. Chip overview UI + placement.

---

## Verification

- Unit tests: `qcStatusCounts`, `EnsembleQc` (fake `QcCheck`: pending→success/error transitions, `setCheckParams` re-deriving without a fetch, `cancelCheck` aborting one check without affecting another), `deriveStatus` for both hydrostatic checks, `useSelectionOverride` (remember/restore).
- Manual: run the dev server, open Model QC, select an ensemble+grid, run the vector and grid checks independently, confirm neither blocks the other, confirm generic matrix/summary render, confirm a threshold edit recomputes instantly with no new request, switch ensembles and back and confirm results persist, trigger a reschedule and confirm only that realization re-runs. Then click a realization in the status matrix, confirm FlowNetwork's realization selection updates and a chip appears in the overview, click the chip's "×", confirm FlowNetwork reverts to its original realization.
