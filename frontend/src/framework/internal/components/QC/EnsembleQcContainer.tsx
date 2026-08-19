import React from "react";

import {
    Block,
    Cancel,
    CheckCircle,
    Error,
    ExpandLess,
    ExpandMore,
    FactCheck,
    FilterAlt,
    PlayArrow,
    PlaylistPlay,
    PriorityHigh,
    RadioButtonUnchecked,
    Replay,
    Stop,
    Troubleshoot,
    Warning,
} from "@mui/icons-material";
import { startCase } from "lodash-es";

import { EnsembleColorTile } from "@framework/components/EnsembleColorTile";
import { REALIZATION_ELEVATED_SETTING } from "@framework/ElevatedSettings/definitions/realization";
import { useElevatedSettingValue } from "@framework/ElevatedSettings/hooks";
import type { EnsembleQc } from "@framework/internal/QC/EnsembleQc";
import type { QcCheckRuntime } from "@framework/internal/QC/QcCheck";
import { QcCheckRuntimeTopic } from "@framework/internal/QC/QcCheck";
import type {
    QcCheckMatrixCoordinate,
    QcCheckRealizationResult,
    QcCheckStepDefinition,
    QcCheckStepMatrixEntry,
    QcCheckStepMatrixRuntime,
    QcCheckStepRuntime,
} from "@framework/internal/QC/QcCheckStep";
import { QcCheckStepGroupTopic, QcCheckStepTopic } from "@framework/internal/QC/QcCheckStep";
import type { Template } from "@framework/TemplateRegistry";
import type { Workbench } from "@framework/Workbench";
import { useEnsembleRealizationFilterFunc } from "@framework/WorkbenchSession";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Menu } from "@lib/components/Menu";
import { Separator } from "@lib/components/Separator";
import { Tooltip } from "@lib/components/Tooltip";
import { DiagonalLine } from "@lib/icons";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useActiveDashboard } from "../ActiveDashboardBoundary";
import { useActiveSession } from "../ActiveSessionBoundary";

import { useQcRealizationPopover } from "./QcRealizationPopover";

type EnsembleQcContainerProps = {
    ensembleQc: EnsembleQc;
    workbench: Workbench;
};

// True while at least one of the ensemble's check runtimes is running - subscribes directly to
// each runtime's own STATUS topic rather than relying on a child re-render, since this needs to
// know the aggregate state up here at the (possibly collapsed) ensemble header.
function useIsAnyCheckRuntimeRunning(checkRuntimes: QcCheckRuntime[]): boolean {
    return React.useSyncExternalStore(
        (onStoreChange) => {
            const unsubscribeFuncs = checkRuntimes.map((checkRuntime) =>
                checkRuntime.getPublishSubscribeDelegate().subscribe(QcCheckRuntimeTopic.STATUS, onStoreChange),
            );
            return () => {
                unsubscribeFuncs.forEach((unsubscribe) => unsubscribe());
            };
        },
        () => checkRuntimes.some((checkRuntime) => checkRuntime.isRunning()),
    );
}

// Subscribes to every step's COORDINATES topic (fires when a step's matrix-coordinate entries are
// added/removed) plus every *currently known* entry's own STATUS/RESULTS - shared by
// `useHasAnyStepRun`/`useCheckOutcomeTone` below. An entry added *after* this subscribes won't have
// its own later updates individually watched by this particular subscription, but that's fine for
// both of those hooks: `CheckRuntimeContainer` already unconditionally subscribes to the check's own
// STATUS topic, which is guaranteed to fire again once the check finishes running - by then every
// entry has settled, and the next `getSnapshot()` call reads it fresh regardless of exactly which
// topic fired.
function subscribeToAllStepEntries(stepRuntimes: QcCheckStepRuntime[], onStoreChange: () => void): () => void {
    const unsubscribeFuncs: (() => void)[] = [];
    for (const stepRuntime of stepRuntimes) {
        unsubscribeFuncs.push(
            stepRuntime.getPublishSubscribeDelegate().subscribe(QcCheckStepGroupTopic.COORDINATES, onStoreChange),
        );
        for (const entry of stepRuntime.getEntries()) {
            const delegate = entry.runtime.getPublishSubscribeDelegate();
            unsubscribeFuncs.push(delegate.subscribe(QcCheckStepTopic.STATUS, onStoreChange));
            unsubscribeFuncs.push(delegate.subscribe(QcCheckStepTopic.RESULTS, onStoreChange));
        }
    }
    return () => {
        unsubscribeFuncs.forEach((unsubscribe) => unsubscribe());
    };
}

// True once at least one of the check's steps has any matrix entry that has been run at least once
// - a check's own results now live on its steps' entries rather than on the check runtime itself.
function useHasAnyStepRun(stepRuntimes: QcCheckStepRuntime[]): boolean {
    return React.useSyncExternalStore(
        (onStoreChange) => subscribeToAllStepEntries(stepRuntimes, onStoreChange),
        () => stepRuntimes.some((stepRuntime) => stepRuntime.getEntries().some((entry) => entry.runtime.hasRun())),
    );
}

type OutcomeTone = "success" | "warning" | "danger";

// A check's overall outcome, once it's done running: green only if every requested realization
// made it all the way through the last step as a success, red if none did, yellow for a mix. When
// the last step is matrixed (e.g. one entry per selected grid), a realization only counts as a
// check-level success if it succeeded in *every* one of the last step's entries - a realization
// that failed anywhere along the way (an earlier step, or any one matrix coordinate of the last
// step) never reappears as a success in all of the last step's entries, so this single check
// already accounts for failures anywhere in the sequence. `null` while the check hasn't finished a
// run yet (its last step hasn't run, e.g. cancelled partway through an earlier step).
function useCheckOutcomeTone(checkRuntime: QcCheckRuntime, stepRuntimes: QcCheckStepRuntime[]): OutcomeTone | null {
    return React.useSyncExternalStore(
        (onStoreChange) => subscribeToAllStepEntries(stepRuntimes, onStoreChange),
        () => {
            const lastStepRuntime = stepRuntimes[stepRuntimes.length - 1];
            const requestedRealizations = checkRuntime.getRequestedRealizations();
            if (!lastStepRuntime || requestedRealizations.length === 0) {
                return null;
            }
            const entries = lastStepRuntime.getEntries();
            if (!entries.some((entry) => entry.runtime.hasRun())) {
                return null;
            }

            let successCount = 0;
            let failureCount = 0;
            for (const realization of requestedRealizations) {
                const succeededEverywhere = entries.every(
                    (entry) => entry.runtime.getResults().get(realization)?.kind === "success",
                );
                if (succeededEverywhere) {
                    successCount++;
                } else {
                    failureCount++;
                }
            }
            if (failureCount === 0) {
                return "success";
            }
            if (successCount === 0) {
                return "danger";
            }
            return "warning";
        },
    );
}

// Flat tally across a set of results (e.g. every cell of every matrix coordinate of one step):
// green only if every result succeeded, red if none did, yellow for a mix. Unlike
// `useCheckOutcomeTone` (which requires a realization to succeed in *every* coordinate), this is
// purely informational - "how much of this step's matrix failed" - so each cell counts on its own.
function outcomeToneFromResults(results: Iterable<QcCheckRealizationResult<unknown>>): OutcomeTone {
    let successCount = 0;
    let failureCount = 0;
    for (const result of results) {
        if (result.kind === "success") {
            successCount++;
        } else {
            failureCount++;
        }
    }
    if (failureCount === 0) {
        return "success";
    }
    if (successCount === 0) {
        return "danger";
    }
    return "warning";
}

// Icon + color for a resolved (non-running, non-skipped, non-idle) outcome - shared by the check's
// own header icon and each step's status icon so the two use the same traffic-light language.
function OutcomeIcon(props: { tone: OutcomeTone }) {
    if (props.tone === "danger") {
        return <Cancel style={{ fontSize: 16 }} className="text-danger-subtle" />;
    }
    if (props.tone === "warning") {
        return <Warning style={{ fontSize: 16 }} className="text-warning-subtle" />;
    }
    return <CheckCircle style={{ fontSize: 16 }} className="text-success-subtle" />;
}

export function EnsembleQcContainer(props: EnsembleQcContainerProps) {
    const session = useActiveSession();
    const checkRuntimes = Array.from(props.ensembleQc.getCheckRuntimes().values());
    const ensemble = props.ensembleQc.getEnsemble();
    const allRealizations = ensemble.getRealizations();
    const realizationsFilterFunc = useEnsembleRealizationFilterFunc(session);
    const activeRealizations = realizationsFilterFunc(ensemble.getIdent());
    const [expanded, setExpanded] = React.useState(false);

    const isAnyCheckRunning = useIsAnyCheckRuntimeRunning(checkRuntimes);

    const readableEnsembleName = ensemble.getCustomName() ?? ensemble.getDisplayName();

    return (
        <div className={resolveClassNames("group outline-neutral-subtle outline")}>
            <div
                className="bg-neutral border-b-neutral-subtle gap-xs p-2xs flex cursor-pointer items-center justify-center border-b"
                onClick={() => setExpanded((prev) => !prev)}
            >
                {expanded ? <ExpandLess style={{ fontSize: 16 }} /> : <ExpandMore style={{ fontSize: 16 }} />}
                <div className="relative flex h-5 w-5 items-center justify-center">
                    <EnsembleColorTile wrapperClassName="w-5 h-5" ensemble={ensemble} />
                    {isAnyCheckRunning && (
                        <CircularProgress
                            size={16}
                            tone="on-emphasis"
                            layoutClassName="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                        />
                    )}
                </div>
                <div className="font-bolder px-2xs text-body-sm flex h-full min-w-0 grow cursor-pointer items-center">
                    <span className="truncate">{readableEnsembleName}</span>
                </div>
                <Button tone="accent" size="small" variant="ghost" iconOnly>
                    <PlaylistPlay style={{ fontSize: 16 }} />
                </Button>
            </div>
            {expanded && (
                <div className="flex flex-col">
                    {checkRuntimes.map((checkRuntime) => (
                        <CheckRuntimeContainer
                            key={checkRuntime.getId()}
                            activeRealizations={activeRealizations}
                            allRealizations={allRealizations}
                            checkRuntime={checkRuntime}
                            workbench={props.workbench}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

type CheckRuntimeContainerProps = {
    checkRuntime: QcCheckRuntime;
    allRealizations: readonly number[];
    activeRealizations: readonly number[];
    workbench: Workbench;
};

function CheckRuntimeContainer(props: CheckRuntimeContainerProps) {
    const { checkRuntime, activeRealizations, allRealizations, workbench } = props;

    const [showSettings, setShowSettings] = React.useState(false);

    // Params are staged locally while the settings view is open, and only committed into the
    // runtime (via `setParams`) when the user clicks Run - there's no separate Apply step. Shared
    // across every step of this check.
    const appliedParams = usePublishSubscribeTopicValue(checkRuntime, QcCheckRuntimeTopic.PARAMS);
    const [stagedParams, setStagedParams] = React.useState(appliedParams);

    const activeDashboard = useActiveDashboard();
    const elevatedSettingsService = activeDashboard.getElevatedSettingsService();

    // `useElevatedSettingValue` (not `getSetting`+`usePublishSubscribeTopicValue`) since a freshly
    // created dashboard (e.g. right after applying a template) hasn't had "realization" added to its
    // `ElevatedSettingsService` yet - `getSetting` throws in that case, this just returns `undefined`
    // and re-renders once the setting shows up.
    const selectedRealization = useElevatedSettingValue(elevatedSettingsService, REALIZATION_ELEVATED_SETTING) ?? null;

    const [expanded, setExpanded] = React.useState(false);

    // Re-renders whenever the check's running state changes - see the `notifySubscribers` calls in
    // `QcCheckRuntime.run()`/`cancel()`. Each step's own results/status are subscribed to
    // individually by `StepBlock` below.
    usePublishSubscribeTopicValue(checkRuntime, QcCheckRuntimeTopic.STATUS);

    const checkDefinition = checkRuntime.getCheckDefinition();
    const stepRuntimes = checkRuntime.getStepRuntimes();
    const isRunning = checkRuntime.isRunning();
    const hasResults = useHasAnyStepRun(stepRuntimes);
    const outcomeTone = useCheckOutcomeTone(checkRuntime, stepRuntimes);

    function handleRunClick() {
        checkRuntime.setParams(stagedParams);
        // Once `run()` flips `isRunning`, the settings view hides itself regardless of
        // `showSettings` - reset it now so a run started from the "no results yet" view doesn't
        // leave the re-run settings view showing once this run completes.
        setShowSettings(false);
        checkRuntime.run(activeRealizations);
    }

    function handleCancelRunClick() {
        checkRuntime.cancel();
    }

    function handleReRunClick() {
        setShowSettings(true);
    }

    function handleBackToResultsClick() {
        // Discard whatever was staged in the settings view - only Run commits it.
        setStagedParams(appliedParams);
        setShowSettings(false);
    }

    function handleApplyTemplateClick(template: Template) {
        // Elevated settings the template's modules need are applied by `Dashboard.fromTemplate`
        // itself (via `Template.elevatedSettings`/`applyElevatedSettings`) - nothing left to do here.
        workbench.getSessionManager().applyTemplate(template);
    }

    function handleRealizationClick(realization: number) {
        if (!elevatedSettingsService.hasSetting(REALIZATION_ELEVATED_SETTING)) {
            elevatedSettingsService.addSetting(REALIZATION_ELEVATED_SETTING);
        }
        const realizationSettingInstance = elevatedSettingsService.getSetting(REALIZATION_ELEVATED_SETTING);
        realizationSettingInstance.setValue(realization);
    }

    function makeResultsContent() {
        // Not-yet-run and re-run both land here: settings + a Play button, plus (only when there
        // are existing results to fall back to) a Cancel button to back out without running again.
        // `!isRunning` takes priority so this auto-hides the moment a run is kicked off, in favor of
        // the step-by-step progress view below.
        const showSettingsView = !isRunning && (showSettings || !hasResults);

        if (showSettingsView) {
            return (
                <div className="p-2xs gap-2xs flex flex-col">
                    {checkDefinition.settingsComponent && (
                        <CheckSettings
                            checkRuntime={checkRuntime}
                            params={stagedParams}
                            onParamsChange={setStagedParams}
                        />
                    )}
                    <div className="gap-xs p-2xs flex items-center justify-end">
                        {hasResults && (
                            <Button tone="neutral" size="small" variant="ghost" onClick={handleBackToResultsClick}>
                                Cancel
                            </Button>
                        )}
                        <Button tone="accent" size="small" variant="contained" onClick={handleRunClick}>
                            <PlayArrow style={{ fontSize: 16 }} />
                            Run
                        </Button>
                    </div>
                </div>
            );
        }

        if (isRunning || hasResults) {
            return (
                <div className="px-2xs py-sm gap-2xs flex flex-col">
                    {appliedParams !== null &&
                        typeof appliedParams === "object" &&
                        Object.keys(appliedParams).length > 0 && (
                            <>
                                <CheckParamsList params={appliedParams} />
                                <Separator orientation="horizontal" />
                            </>
                        )}
                    <div className="gap-2xs flex flex-col">
                        {stepRuntimes.map((stepRuntime, index) => (
                            <React.Fragment key={stepRuntime.getStepDefinition().name}>
                                {index > 0 && <Separator orientation="horizontal" />}
                                <StepBlock
                                    stepRuntime={stepRuntime}
                                    activeRealizations={activeRealizations}
                                    allRealizations={allRealizations}
                                    selectedRealization={selectedRealization}
                                    onRealizationClick={handleRealizationClick}
                                    onApplyTemplateClick={handleApplyTemplateClick}
                                    isLastStep={index === stepRuntimes.length - 1}
                                />
                            </React.Fragment>
                        ))}
                    </div>
                    {!isRunning && (
                        <>
                            <Separator orientation="horizontal" />
                            <div className="gap-xs flex items-center justify-end">
                                <Button tone="neutral" size="small" variant="ghost" onClick={handleReRunClick}>
                                    <Replay style={{ fontSize: 16 }} />
                                    Re-run
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            );
        }

        return <div className="p-2xs text-neutral-subtle text-body-sm">No results yet</div>;
    }

    return (
        <div className="flex flex-col">
            <div className="gap-xs bg-neutral/50 border-b-neutral-subtle hover:bg-neutral/80 flex items-center border-b">
                <div
                    className="font-bolder p-2xs text-body-sm gap-xs flex grow cursor-pointer"
                    onClick={() => setExpanded((prev) => !prev)}
                >
                    {expanded ? <ExpandLess style={{ fontSize: 16 }} /> : <ExpandMore style={{ fontSize: 16 }} />}
                    {isRunning ? (
                        <CircularProgress size={16} />
                    ) : outcomeTone ? (
                        <OutcomeIcon tone={outcomeTone} />
                    ) : (
                        <FactCheck style={{ fontSize: 16 }} />
                    )}
                    <span className="grow truncate">{checkDefinition.name}</span>
                </div>
                {isRunning && (
                    <div className="p-2xs">
                        <Button tone="accent" size="small" variant="ghost" iconOnly onClick={handleCancelRunClick}>
                            <Stop style={{ fontSize: 16 }} />
                        </Button>
                    </div>
                )}
            </div>
            {expanded && (
                <>
                    <div>{makeResultsContent()}</div>
                </>
            )}
        </div>
    );
}

type MatrixEntriesAggregateStatus = {
    isRunning: boolean;
    hasRun: boolean;
    // `true` only once every entry is skipped - a step with a mix of skipped/ran entries still has
    // something to show, so it isn't treated as skipped overall.
    skipped: boolean;
    outcomeTone: OutcomeTone | null;
    // Flat tally across every matrix entry's results, by `QcCheckRealizationResult.kind` - powers
    // the collapsed-state summary (see `StepResultCountsSummary`) as well as `outcomeTone` below.
    successCount: number;
    failureCount: number;
    exceptionCount: number;
};

function computeMatrixEntriesStatus(entries: QcCheckStepMatrixEntry[]): MatrixEntriesAggregateStatus {
    const isRunning = entries.some((entry) => entry.runtime.isRunning());
    const hasRun = entries.some((entry) => entry.runtime.hasRun());
    const skipped = entries.length > 0 && entries.every((entry) => entry.runtime.isSkipped());

    let successCount = 0;
    let failureCount = 0;
    let exceptionCount = 0;
    for (const entry of entries) {
        for (const result of entry.runtime.getResults().values()) {
            if (result.kind === "success") {
                successCount++;
            } else if (result.kind === "failure") {
                failureCount++;
            } else {
                exceptionCount++;
            }
        }
    }

    const outcomeTone =
        hasRun && !isRunning && !skipped
            ? outcomeToneFromResults(entries.flatMap((entry) => Array.from(entry.runtime.getResults().values())))
            : null;
    return { isRunning, hasRun, skipped, outcomeTone, successCount, failureCount, exceptionCount };
}

// Aggregates a step's current matrix entries into one status for the step's own header icon -
// re-renders whenever any entry's own STATUS/RESULTS changes. Caches the computed aggregate
// (invalidated only when a subscribed topic actually fires) since `useSyncExternalStore` requires
// `getSnapshot` to return a referentially stable value when nothing has changed.
function useMatrixEntriesStatus(entries: QcCheckStepMatrixEntry[]): MatrixEntriesAggregateStatus {
    const cacheRef = React.useRef<{ entries: QcCheckStepMatrixEntry[]; status: MatrixEntriesAggregateStatus } | null>(
        null,
    );

    return React.useSyncExternalStore(
        (onStoreChange) => {
            const unsubscribeFuncs = entries.flatMap((entry) => {
                const delegate = entry.runtime.getPublishSubscribeDelegate();
                const invalidateAndNotify = () => {
                    cacheRef.current = null;
                    onStoreChange();
                };
                return [
                    delegate.subscribe(QcCheckStepTopic.STATUS, invalidateAndNotify),
                    delegate.subscribe(QcCheckStepTopic.RESULTS, invalidateAndNotify),
                ];
            });
            return () => {
                unsubscribeFuncs.forEach((unsubscribe) => unsubscribe());
            };
        },
        () => {
            if (!cacheRef.current || cacheRef.current.entries !== entries) {
                cacheRef.current = { entries, status: computeMatrixEntriesStatus(entries) };
            }
            return cacheRef.current.status;
        },
    );
}

type StepBlockProps = {
    stepRuntime: QcCheckStepRuntime;
    allRealizations: readonly number[];
    activeRealizations: readonly number[];
    selectedRealization: number | null;
    onRealizationClick: (realization: number) => void;
    onApplyTemplateClick: (template: Template) => void;
    // Only the last step's details are shown by default - earlier steps are collapsed to just
    // their status, since the last step's outcome is what a passing/failing check ultimately comes
    // down to. Any step can still be expanded on demand as soon as it has something to show (see
    // `showBody` below) - not just once the whole check has finished running.
    isLastStep: boolean;
};

// One step of a check's sequence, mirroring a GitHub Actions job's step list: its own status
// (pending/running/skipped/done), and one `MatrixEntryBlock` per matrix-coordinate entry (just one,
// unlabeled, for a plain non-matrixed step - see `QcCheckStepRuntime`).
function StepBlock(props: StepBlockProps) {
    const {
        stepRuntime,
        activeRealizations,
        allRealizations,
        selectedRealization,
        onRealizationClick,
        onApplyTemplateClick,
        isLastStep,
    } = props;

    const [expanded, setExpanded] = React.useState(isLastStep);

    // Re-renders whenever this step's set of matrix-coordinate entries changes (rare - only on
    // add/remove, see `QcCheckStepRuntime.reset`).
    const entries = usePublishSubscribeTopicValue(stepRuntime, QcCheckStepGroupTopic.COORDINATES);
    const { isRunning, hasRun, skipped, outcomeTone, successCount, failureCount, exceptionCount } =
        useMatrixEntriesStatus(entries);
    // A step becomes expandable as soon as it's running or has something to show (`hasRun` is set
    // the moment a step starts, before `isRunning` - see `QcCheckStepMatrixRuntime.run`) - not
    // gated on the whole check having finished, so an earlier step's progress can be watched live
    // while a later step is still running.
    const showBody = expanded && hasRun;

    const stepDefinition = stepRuntime.getStepDefinition();
    // Only label each entry with its coordinate once there's more than one to tell apart - a
    // single-grid matrixed step (or a plain non-matrixed one) renders exactly like today.
    const showCoordinateLabels = entries.length > 1;

    function statusIcon() {
        if (isRunning) {
            return <CircularProgress size={16} />;
        }
        if (skipped) {
            return <Block style={{ fontSize: 16 }} className="text-neutral-subtle" />;
        }
        if (hasRun && outcomeTone) {
            return <OutcomeIcon tone={outcomeTone} />;
        }
        return <RadioButtonUnchecked style={{ fontSize: 16 }} className="text-neutral-subtle" />;
    }

    return (
        <div className="gap-2xs flex flex-col">
            <div
                className="gap-xs text-body-sm font-bolder hover:bg-neutral/30 p-2xs flex cursor-pointer items-center"
                onClick={() => setExpanded((prev) => !prev)}
            >
                {expanded ? <ExpandLess style={{ fontSize: 16 }} /> : <ExpandMore style={{ fontSize: 16 }} />}
                {statusIcon()}
                <span className="grow">{stepDefinition.name}</span>
                {hasRun && !skipped && (
                    <StepResultCountsSummary
                        successCount={successCount}
                        failureCount={failureCount}
                        exceptionCount={exceptionCount}
                    />
                )}
            </div>
            {showBody && (
                <div className="gap-2xs pl-lg flex flex-col">
                    {entries.map((entry) => (
                        <MatrixEntryBlock
                            key={entry.coordinate?.key ?? "single"}
                            matrixRuntime={entry.runtime}
                            coordinate={showCoordinateLabels ? entry.coordinate : null}
                            checkName={
                                showCoordinateLabels && entry.coordinate
                                    ? `${stepDefinition.name} (${entry.coordinate.label})`
                                    : stepDefinition.name
                            }
                            stepDefinition={stepDefinition}
                            activeRealizations={activeRealizations}
                            allRealizations={allRealizations}
                            selectedRealization={selectedRealization}
                            onRealizationClick={onRealizationClick}
                            onApplyTemplateClick={onApplyTemplateClick}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

type StepResultCountsSummaryProps = {
    successCount: number;
    failureCount: number;
    exceptionCount: number;
};

// A quick success/failure/error tally shown next to a step's name only while it's collapsed, so its
// outcome breakdown is visible without expanding into the full realization matrix below.
function StepResultCountsSummary(props: StepResultCountsSummaryProps) {
    const { successCount, failureCount, exceptionCount } = props;

    return (
        <span className="gap-sm text-body-xs flex items-center font-normal">
            <Tooltip content={`${successCount} realization${successCount === 1 ? "" : "s"} succeeded`}>
                <span className="text-success-subtle gap-2xs flex items-center">
                    <CheckCircle style={{ fontSize: 14 }} />
                    {successCount}
                </span>
            </Tooltip>
            <Tooltip content={`${failureCount} realization${failureCount === 1 ? "" : "s"} failed`}>
                <span className="text-danger-subtle gap-2xs flex items-center">
                    <Cancel style={{ fontSize: 14 }} />
                    {failureCount}
                </span>
            </Tooltip>
            {exceptionCount > 0 && (
                <Tooltip content={`${exceptionCount} realization${exceptionCount === 1 ? "" : "s"} errored`}>
                    <span className="text-warning-subtle gap-2xs flex items-center">
                        <Error style={{ fontSize: 14 }} />
                        {exceptionCount}
                    </span>
                </Tooltip>
            )}
        </span>
    );
}

type MatrixEntryBlockProps = {
    matrixRuntime: QcCheckStepMatrixRuntime;
    // Non-`null` only when this entry's coordinate should be labeled (see `StepBlock`'s
    // `showCoordinateLabels`).
    coordinate: QcCheckMatrixCoordinate | null;
    checkName: string;
    stepDefinition: QcCheckStepDefinition;
    allRealizations: readonly number[];
    activeRealizations: readonly number[];
    selectedRealization: number | null;
    onRealizationClick: (realization: number) => void;
    onApplyTemplateClick: (template: Template) => void;
};

// One matrix coordinate's own realization matrix - its own results, its own skipped/loading state,
// its own "Investigate" menu - since a step's `TMetrics` (and thus its `resultComponent`/
// `templates`) is its own, and each coordinate independently produces one full set of it.
function MatrixEntryBlock(props: MatrixEntryBlockProps) {
    const {
        matrixRuntime,
        coordinate,
        checkName,
        stepDefinition,
        allRealizations,
        activeRealizations,
        selectedRealization,
        onRealizationClick,
        onApplyTemplateClick,
    } = props;

    usePublishSubscribeTopicValue(matrixRuntime, QcCheckStepTopic.RESULTS);
    usePublishSubscribeTopicValue(matrixRuntime, QcCheckStepTopic.STATUS);

    const isRunning = matrixRuntime.isRunning();
    const hasRun = matrixRuntime.hasRun();
    const skipped = matrixRuntime.isSkipped();
    const results = matrixRuntime.getResults();
    const requestedRealizations = matrixRuntime.getRequestedRealizations();
    // Shared by template resolution and `onApplyTemplateClick` - both need this coordinate's own
    // realizations and results, not the step in the abstract.
    const templateContext = { realizations: requestedRealizations, results };
    const templates = !isRunning && hasRun && !skipped ? (stepDefinition.templates?.(templateContext) ?? []) : [];

    if (!hasRun && !skipped) {
        return null;
    }

    return (
        <div className="gap-2xs flex flex-col">
            {coordinate && <span className="text-neutral-subtle text-body-xs font-bolder">{coordinate.label}</span>}
            {skipped && (
                <span className="text-neutral-subtle text-body-sm">
                    Skipped - none of the previous step&apos;s realizations succeeded.
                </span>
            )}
            {!skipped && (
                <>
                    <RealizationSquares
                        matrixRuntime={matrixRuntime}
                        checkName={checkName}
                        activeRealizations={activeRealizations}
                        allRealizations={allRealizations}
                        results={results}
                        isRunning={isRunning}
                        requestedRealizations={requestedRealizations}
                        hasRun={hasRun}
                        selectedRealization={selectedRealization}
                        onRealizationClick={onRealizationClick}
                    />
                    {templates.length > 0 && (
                        <div className="flex items-center justify-end">
                            <Menu.Root>
                                <Menu.Trigger>
                                    <Button tone="accent" size="small" variant="contained">
                                        <Troubleshoot style={{ fontSize: 16 }} />
                                        Investigate
                                    </Button>
                                </Menu.Trigger>
                                <Menu.Popup>
                                    <Menu.Group>
                                        <Menu.GroupLabel>Apply template</Menu.GroupLabel>
                                        {templates.map((template) => (
                                            <Menu.Item
                                                key={template.name}
                                                text={template.name}
                                                onClick={() => onApplyTemplateClick(template)}
                                            />
                                        ))}
                                    </Menu.Group>
                                </Menu.Popup>
                            </Menu.Root>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

type CheckParamsListProps = {
    params: unknown;
};

// Checks don't provide per-param display labels, so this renders whatever object shape a check's
// `TParams` happens to be as a generic key/value list, humanizing the object keys.
function CheckParamsList(props: CheckParamsListProps) {
    const { params } = props;

    if (params === null || typeof params !== "object") {
        return null;
    }

    const entries = Object.entries(params as Record<string, unknown>);
    if (entries.length === 0) {
        return null;
    }

    return (
        <ul className="text-body-sm gap-3xs flex flex-col items-start">
            {entries.map(([key, value]) => (
                <li key={key}>
                    <span className="text-neutral-subtle">{startCase(key)}:</span> {formatParamValue(value)}
                </li>
            ))}
        </ul>
    );
}

function formatParamValue(value: unknown): string {
    if (value === null || value === undefined) {
        return "Not set";
    }
    if (typeof value === "string") {
        return value;
    }
    if (Array.isArray(value)) {
        // E.g. a multi-select param like the hydrostatic equilibrium check's `gridNames` - a
        // comma-separated list reads far better than `JSON.stringify`'s `["A","B"]`.
        return value.length === 0 ? "Not set" : value.map(formatParamValue).join(", ");
    }
    if (typeof value === "object") {
        return JSON.stringify(value);
    }
    return String(value);
}

type CheckSettingsProps = {
    checkRuntime: QcCheckRuntime;
    params: unknown;
    onParamsChange: (params: unknown) => void;
};

// Renders a check's own `settingsComponent` against params staged by the parent - there's no
// Apply step here, the parent commits them into the runtime (via `setParams`) when Run is clicked.
function CheckSettings(props: CheckSettingsProps) {
    const { checkRuntime, params, onParamsChange } = props;

    const SettingsComponent = checkRuntime.getCheckDefinition().settingsComponent;
    if (!SettingsComponent) {
        return null;
    }

    return (
        <div className="border-neutral-subtle p-2xs gap-2xs flex flex-col border-b">
            <SettingsComponent ensemble={checkRuntime.getEnsemble()} params={params} onParamsChange={onParamsChange} />
        </div>
    );
}

type RealizationStatusTone = "idle" | "loading" | "success" | "failure" | "exception" | "excluded" | "filteredAway";

const REALIZATION_STATUS_TONE_TO_CLASSNAME: Record<RealizationStatusTone, string> = {
    idle: "border border-neutral-strong hover:outline-2",
    loading: "bg-neutral animate-pulse transition-opacity duration-4000 hover:outline",
    success:
        "bg-success-strong border-success-strong border hover:outline hover:outline-success cursor-pointer hover:outline",
    failure: "bg-danger-strong border border-danger-strong hover:outline-danger cursor-pointer hover:outline",
    exception:
        "text-danger-subtle border-danger-subtle border hover:outline hover:outline-danger hover:outline cursor-pointer opacity-50",
    excluded: "border border-warning-subtle text-warning-subtle hover:border-warning-strong opacity-50 cursor-pointer",
    filteredAway: "border-neutral-subtle border text-neutral-subtle cursor-not-allowed opacity-50",
};

const REALIZATION_STATUS_TO_SELECTED_CLASSNAME: Partial<Record<RealizationStatusTone, string>> = {
    success: "outline outline-focus hover:outline-focus!",
    failure: "outline outline-focus hover:outline-focus!",
    exception: "outline outline-focus hover:outline-focus!",
    excluded: "outline outline-focus hover:outline-focus!",
};

const REALIZATION_STATUS_TO_CONTENT: Partial<Record<RealizationStatusTone, React.ReactNode>> = {
    exception: <PriorityHigh />,
    filteredAway: <FilterAlt />,
    excluded: <DiagonalLine />,
};

type RealizationSquaresProps = {
    matrixRuntime: QcCheckStepMatrixRuntime;
    checkName: string;
    allRealizations: readonly number[];
    activeRealizations: readonly number[];
    results: ReadonlyMap<number, QcCheckRealizationResult<unknown>>;
    isRunning: boolean;
    // This step's own carried-forward realizations for this matrix coordinate (see
    // `QcCheckStepMatrixRuntime.getRequestedRealizations`) - an active realization missing from this
    // set didn't fail *here*, it never made it past an earlier step, so it renders as "excluded"
    // rather than "idle".
    requestedRealizations: readonly number[];
    hasRun: boolean;
    onRealizationClick: (realization: number) => void;
    selectedRealization: number | null;
};

// Realizations are grouped into rows of 5 with a row-start label, same layout as
// `EnsembleRealizationFilter`'s `RealizationNumberDisplay` - only the shape (square, colored by QC
// outcome) and the cell content (a pulsing skeleton while a result is pending) differ.
const REALIZATION_GROUP_SIZE = 5;
const SQUARE_SIZE_PX = 12;
const GAP_PX = 4;
const LABEL_WIDTH_PX = 28;
const LABEL_HEIGHT_PX = 16;
// Stagger the pulse animation per square (like `Table`'s `PendingRows`) so a running batch reads as
// a shimmer rather than every square pulsing in lockstep.
const LOADING_ANIMATION_STAGGER_COUNT = 5;
const LOADING_ANIMATION_STAGGER_STEP_SECS = 0.15;

// One small square per realization, colored by outcome. Realizations that are part of the
// currently running matrix coordinate but have not reported a result yet show a pulsing skeleton
// square instead of a static one.
function RealizationSquares(props: RealizationSquaresProps) {
    const {
        matrixRuntime,
        checkName,
        allRealizations,
        activeRealizations,
        results,
        isRunning,
        requestedRealizations,
        hasRun,
        onRealizationClick,
    } = props;

    const qcRealizationPopover = useQcRealizationPopover();
    // Anchors the popover to the whole realization-squares grid for this matrix coordinate, rather
    // than to an individual square or row - anchoring to a single row overlapped neighboring rows
    // since they sit so close together.
    const containerRef = React.useRef<HTMLDivElement>(null);

    if (allRealizations.length === 0) {
        return null;
    }

    const activeRealizationsSet = new Set(activeRealizations);
    const requestedRealizationsSet = new Set(requestedRealizations);
    const sortedRealizations = [...allRealizations].sort((a, b) => a - b);
    const numGroups = Math.ceil(sortedRealizations.length / REALIZATION_GROUP_SIZE);
    const groups = Array.from({ length: numGroups }, (_, g) =>
        sortedRealizations.slice(g * REALIZATION_GROUP_SIZE, g * REALIZATION_GROUP_SIZE + REALIZATION_GROUP_SIZE),
    );

    function handleSquareClick(realization: number) {
        if (!containerRef.current) {
            return;
        }
        qcRealizationPopover.select({ matrixRuntime, checkName, realization, anchorElement: containerRef.current });
        onRealizationClick(realization);
    }

    // A realization not in `activeRealizations` was excluded by the realization filter before this
    // check ever ran, so it never has a result. A realization that *is* active but missing from
    // `requestedRealizations` (this step's own carried-forward set, see
    // `QcCheckStepMatrixRuntime.getRequestedRealizations`) wasn't filtered - it simply didn't survive
    // an earlier step - so the two get visually distinct tones ("filteredAway" vs "excluded") even
    // though neither has a result to show here.
    function makeSquareColor(realization: number): RealizationStatusTone {
        if (!activeRealizationsSet.has(realization)) {
            return "filteredAway";
        }
        const result = results.get(realization);
        const isLoading = !result && isRunning && requestedRealizationsSet.has(realization);
        if (isLoading) {
            return "loading";
        }
        if (result) {
            if (result.kind === "success") {
                return "success";
            }
            return result.kind === "failure" ? "failure" : "exception";
        }
        if (hasRun && !requestedRealizationsSet.has(realization)) {
            return "excluded";
        }
        return "idle";
    }

    function makeTooltipContent(realization: number, tone: RealizationStatusTone): string {
        const result = results.get(realization);
        if (tone === "filteredAway") {
            return `Realization ${realization}: filtered away`;
        }
        if (tone === "excluded") {
            return `Realization ${realization}: excluded - did not succeed in an earlier step`;
        }
        if (tone === "loading") {
            return `Realization ${realization}: running…`;
        }
        if (!result) {
            return `Realization ${realization}: not run`;
        }
        if (result.kind === "success") {
            return `Realization ${realization}: success`;
        }
        if (result.kind === "failure") {
            return `Realization ${realization}: failed - ${result.reason}`;
        }
        return `Realization ${realization}: ${result.errorMessage}`;
    }

    return (
        <div ref={containerRef} style={{ paddingLeft: LABEL_WIDTH_PX, paddingTop: LABEL_HEIGHT_PX }}>
            <div className="isolate flex flex-wrap" style={{ gap: GAP_PX }}>
                {groups.map((group) => (
                    <div key={group[0]} className="relative">
                        <span
                            style={{ left: -LABEL_WIDTH_PX, width: LABEL_WIDTH_PX - GAP_PX }}
                            className="text-neutral-subtle absolute z-0 flex h-full items-center justify-end text-[10px] leading-none select-none"
                        >
                            {group[0]}
                        </span>
                        <span
                            style={{ top: -LABEL_HEIGHT_PX, width: LABEL_WIDTH_PX, height: LABEL_HEIGHT_PX }}
                            className="text-neutral-subtle absolute z-0 flex h-full items-center text-[10px] leading-none select-none"
                        >
                            {group[0]}
                        </span>
                        <div className="bg-surface relative z-1 flex" style={{ gap: GAP_PX, paddingRight: GAP_PX }}>
                            {group.map((realization) => {
                                const tone = makeSquareColor(realization);
                                const isLoading = tone === "loading";
                                const tooltipContent = makeTooltipContent(realization, tone);
                                const animationDelay = isLoading
                                    ? `${(realization % LOADING_ANIMATION_STAGGER_COUNT) * LOADING_ANIMATION_STAGGER_STEP_SECS}s`
                                    : undefined;

                                function localHandleSquareClick(realization: number) {
                                    if (tone === "loading" || tone === "filteredAway") {
                                        return;
                                    }
                                    handleSquareClick(realization);
                                }

                                return (
                                    <Tooltip key={realization} content={tooltipContent}>
                                        <div
                                            onClick={() => localHandleSquareClick(realization)}
                                            style={{ width: SQUARE_SIZE_PX, height: SQUARE_SIZE_PX, animationDelay }}
                                            className={resolveClassNames(
                                                "flex items-center justify-center rounded-xs p-0",
                                                {
                                                    "outline-accent outline-3 outline-double":
                                                        realization === props.selectedRealization,
                                                    [REALIZATION_STATUS_TO_SELECTED_CLASSNAME[tone] ?? ""]:
                                                        realization === props.selectedRealization && !isLoading,
                                                },
                                                REALIZATION_STATUS_TONE_TO_CLASSNAME[tone],
                                            )}
                                        >
                                            {REALIZATION_STATUS_TO_CONTENT[tone] ?? null}
                                        </div>
                                    </Tooltip>
                                );
                            })}
                            {Array.from({ length: REALIZATION_GROUP_SIZE - group.length }).map((_, i) => (
                                <div
                                    key={`placeholder-${i}`}
                                    style={{ width: SQUARE_SIZE_PX, height: SQUARE_SIZE_PX }}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
