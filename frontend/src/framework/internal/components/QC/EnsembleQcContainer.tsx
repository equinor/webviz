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
    PriorityHigh,
    RadioButtonUnchecked,
    Replay,
    Stop,
    Troubleshoot,
    Warning,
} from "@mui/icons-material";
import { isEqual, startCase } from "lodash-es";

import { EnsembleColorTile } from "@framework/components/EnsembleColorTile";
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

import { useActiveSession } from "../ActiveSessionBoundary";

import { useQcRealizationPopover } from "./QcRealizationPopover";

type EnsembleQcContainerProps = {
    ensembleQc: EnsembleQc;
    workbench: Workbench;
};

// True while any of the ensemble's checks is running
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

// Subscribes to the steps' entries and to each entry's status and results
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

// True once any of the check's steps has run
function useHasAnyStepRun(stepRuntimes: QcCheckStepRuntime[]): boolean {
    return React.useSyncExternalStore(
        (onStoreChange) => subscribeToAllStepEntries(stepRuntimes, onStoreChange),
        () => stepRuntimes.some((stepRuntime) => stepRuntime.getEntries().some((entry) => entry.runtime.hasRun())),
    );
}

type OutcomeTone = "success" | "warning" | "danger";

// A check's overall outcome: green if every realization succeeded in all of the last step's
// entries, red if none did, yellow for a mix. `null` until every entry of the last step has run.
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
            const allEntriesRan = entries.length > 0 && entries.every((entry) => entry.runtime.hasRun());
            if (!allEntriesRan) {
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

// A step's outcome over all its entries: green if every requested realization succeeded, red if
// none did, yellow for a mix. A missing result counts as not succeeded.
function outcomeToneFromEntries(entries: QcCheckStepMatrixEntry[]): OutcomeTone {
    let successCount = 0;
    let failureCount = 0;
    for (const entry of entries) {
        const results = entry.runtime.getResults();
        for (const realization of entry.runtime.getRequestedRealizations()) {
            if (results.get(realization)?.kind === "success") {
                successCount++;
            } else {
                failureCount++;
            }
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

// Icon for a finished check or step
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
            <div className="bg-neutral border-b-neutral-subtle gap-xs p-2xs flex items-center justify-center border-b">
                <button
                    type="button"
                    aria-expanded={expanded}
                    className="focusable gap-xs flex min-w-0 grow cursor-pointer items-center text-left"
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
                    <div className="font-bolder px-2xs text-body-sm flex h-full min-w-0 grow items-center">
                        <span className="truncate">{readableEnsembleName}</span>
                    </div>
                </button>
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

    // Edited params are only committed to the runtime when Run is clicked
    const appliedParams = usePublishSubscribeTopicValue(checkRuntime, QcCheckRuntimeTopic.PARAMS);
    const [stagedParams, setStagedParams] = React.useState(appliedParams);

    // TODO: Read from the dashboard's "realization" elevated setting once that framework is in place
    const selectedRealization: number | null = null;

    const [expanded, setExpanded] = React.useState(false);

    // Results are shown against the realizations the run started with - the live filter
    // (`activeRealizations`) only applies to the next run
    const { requestedRealizations: runRealizations } = usePublishSubscribeTopicValue(
        checkRuntime,
        QcCheckRuntimeTopic.STATUS,
    );

    const checkDefinition = checkRuntime.getCheckDefinition();
    const stepRuntimes = checkRuntime.getStepRuntimes();
    const isRunning = checkRuntime.isRunning();
    const hasResults = useHasAnyStepRun(stepRuntimes);
    const outcomeTone = useCheckOutcomeTone(checkRuntime, stepRuntimes);

    function handleRunClick() {
        checkRuntime.setParams(stagedParams);
        // So the settings view doesn't reappear once this run completes
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
        // Discard the edited params
        setStagedParams(appliedParams);
        setShowSettings(false);
    }

    function handleApplyTemplateClick(template: Template) {
        // TODO: Apply the template's elevated settings once that framework is in place
        workbench.getSessionManager().applyTemplate(template);
    }

    function handleRealizationClick() {
        // TODO: Set the dashboard's "realization" elevated setting once that framework is in place
    }

    function makeResultsContent() {
        // Settings and Run, before the first run or when re-running
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
                                    runRealizations={runRealizations}
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
                <button
                    type="button"
                    aria-expanded={expanded}
                    className="focusable font-bolder p-2xs text-body-sm gap-xs flex min-w-0 grow cursor-pointer text-left"
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
                </button>
                {isRunning && (
                    <div className="p-2xs">
                        <Button
                            tone="danger"
                            size="small"
                            variant="ghost"
                            iconOnly
                            onClick={handleCancelRunClick}
                            aria-label="Cancel running QC check"
                        >
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
    // Only when every entry is skipped
    skipped: boolean;
    outcomeTone: OutcomeTone | null;
    // Counted over all entries
    successCount: number;
    failureCount: number;
    exceptionCount: number;
    // Realizations without a result, counted over all entries
    notRunCount: number;
};

function computeMatrixEntriesStatus(
    entries: QcCheckStepMatrixEntry[],
    allRealizations: readonly number[],
): MatrixEntriesAggregateStatus {
    const isRunning = entries.some((entry) => entry.runtime.isRunning());
    const hasRun = entries.some((entry) => entry.runtime.hasRun());
    // A run cancelled before reaching every coordinate must not look complete
    const allEntriesRan = entries.length > 0 && entries.every((entry) => entry.runtime.hasRun());
    const skipped = entries.length > 0 && entries.every((entry) => entry.runtime.isSkipped());

    let successCount = 0;
    let failureCount = 0;
    let exceptionCount = 0;
    let notRunCount = 0;
    for (const entry of entries) {
        const results = entry.runtime.getResults();
        for (const result of results.values()) {
            if (result.kind === "success") {
                successCount++;
            } else if (result.kind === "failure") {
                failureCount++;
            } else {
                exceptionCount++;
            }
        }
        notRunCount += Math.max(allRealizations.length - results.size, 0);
    }

    const outcomeTone = allEntriesRan && !isRunning && !skipped ? outcomeToneFromEntries(entries) : null;
    return { isRunning, hasRun, skipped, outcomeTone, successCount, failureCount, exceptionCount, notRunCount };
}

// Combines a step's entries into one status. Computed on every read, so a change between render and
// subscribing isn't missed - the previous object is reused while its values are unchanged, to keep
// the snapshot referentially stable.
function useMatrixEntriesStatus(
    entries: QcCheckStepMatrixEntry[],
    allRealizations: readonly number[],
): MatrixEntriesAggregateStatus {
    const lastStatusRef = React.useRef<MatrixEntriesAggregateStatus | null>(null);

    function subscribe(onStoreChange: () => void): () => void {
        const unsubscribeFuncs = entries.flatMap((entry) => {
            const delegate = entry.runtime.getPublishSubscribeDelegate();
            return [
                delegate.subscribe(QcCheckStepTopic.STATUS, onStoreChange),
                delegate.subscribe(QcCheckStepTopic.RESULTS, onStoreChange),
            ];
        });
        return () => {
            unsubscribeFuncs.forEach((unsubscribe) => unsubscribe());
        };
    }

    function getSnapshot(): MatrixEntriesAggregateStatus {
        const status = computeMatrixEntriesStatus(entries, allRealizations);
        const lastStatus = lastStatusRef.current;
        if (lastStatus && isEqual(lastStatus, status)) {
            return lastStatus;
        }
        lastStatusRef.current = status;
        return status;
    }

    return React.useSyncExternalStore(subscribe, getSnapshot);
}

type StepBlockProps = {
    stepRuntime: QcCheckStepRuntime;
    allRealizations: readonly number[];
    // The realizations the check's run was started with
    runRealizations: readonly number[];
    selectedRealization: number | null;
    onRealizationClick: (realization: number) => void;
    onApplyTemplateClick: (template: Template) => void;
    // Only the last step is expanded by default
    isLastStep: boolean;
};

// One step: its status, and a realization grid per matrix coordinate
function StepBlock(props: StepBlockProps) {
    const {
        stepRuntime,
        runRealizations,
        allRealizations,
        selectedRealization,
        onRealizationClick,
        onApplyTemplateClick,
        isLastStep,
    } = props;

    const [expanded, setExpanded] = React.useState(isLastStep);

    const entries = usePublishSubscribeTopicValue(stepRuntime, QcCheckStepGroupTopic.COORDINATES);
    const { isRunning, hasRun, skipped, outcomeTone, successCount, failureCount, exceptionCount, notRunCount } =
        useMatrixEntriesStatus(entries, allRealizations);
    // Expandable as soon as the step has started, so its progress can be followed
    const showBody = expanded && hasRun;

    const stepDefinition = stepRuntime.getStepDefinition();
    // Only label the entries when there is more than one
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
            <div className="gap-xs text-body-sm font-bolder hover:bg-neutral/30 p-2xs flex items-center">
                <button
                    type="button"
                    aria-expanded={expanded}
                    className="focusable gap-xs flex min-w-0 grow cursor-pointer items-center text-left"
                    onClick={() => setExpanded((prev) => !prev)}
                >
                    {expanded ? <ExpandLess style={{ fontSize: 16 }} /> : <ExpandMore style={{ fontSize: 16 }} />}
                    {statusIcon()}
                    <span className="grow">{stepDefinition.name}</span>
                </button>
                {/* Outside the button, since its tooltips are interactive */}
                {hasRun && !skipped && (
                    <StepResultCountsSummary
                        successCount={successCount}
                        failureCount={failureCount}
                        exceptionCount={exceptionCount}
                        notRunCount={notRunCount}
                        isRunning={isRunning}
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
                            runRealizations={runRealizations}
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
    notRunCount: number;
    // The not-run count is only shown once the step is done
    isRunning: boolean;
};

// Result counts shown next to a step's name
function StepResultCountsSummary(props: StepResultCountsSummaryProps) {
    const { successCount, failureCount, exceptionCount, notRunCount, isRunning } = props;

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
            {!isRunning && notRunCount > 0 && (
                <Tooltip
                    content={`${notRunCount} realization${notRunCount === 1 ? "" : "s"} not run - filtered away or excluded because they did not succeed in an earlier step`}
                >
                    <span className="text-neutral-subtle gap-2xs flex items-center">
                        <Block style={{ fontSize: 14 }} />
                        {notRunCount}
                    </span>
                </Tooltip>
            )}
        </span>
    );
}

type MatrixEntryBlockProps = {
    matrixRuntime: QcCheckStepMatrixRuntime;
    // `null` when the entry shouldn't be labeled
    coordinate: QcCheckMatrixCoordinate | null;
    checkName: string;
    stepDefinition: QcCheckStepDefinition;
    allRealizations: readonly number[];
    runRealizations: readonly number[];
    selectedRealization: number | null;
    onRealizationClick: (realization: number) => void;
    onApplyTemplateClick: (template: Template) => void;
};

// One matrix coordinate's realization grid and "Investigate" menu
function MatrixEntryBlock(props: MatrixEntryBlockProps) {
    const {
        matrixRuntime,
        coordinate,
        checkName,
        stepDefinition,
        allRealizations,
        runRealizations,
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
                        runRealizations={runRealizations}
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

// Lists the params as key/value pairs
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

// Renders the check's own settings component
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
    // The realizations the check's run was started with
    runRealizations: readonly number[];
    results: ReadonlyMap<number, QcCheckRealizationResult<unknown>>;
    isRunning: boolean;
    // The realizations this entry was asked to run
    requestedRealizations: readonly number[];
    hasRun: boolean;
    onRealizationClick: (realization: number) => void;
    selectedRealization: number | null;
};

// Realizations are shown in groups of 5, each with a label
const REALIZATION_GROUP_SIZE = 5;
const SQUARE_SIZE_PX = 12;
const GAP_PX = 4;
const LABEL_WIDTH_PX = 28;
const LABEL_HEIGHT_PX = 16;
// Staggers the loading animation between squares
const LOADING_ANIMATION_STAGGER_COUNT = 5;
const LOADING_ANIMATION_STAGGER_STEP_SECS = 0.15;

// Width that pads a partial group to the width of a full one
function makeGroupFillerWidthPx(missingCount: number): number {
    return missingCount * SQUARE_SIZE_PX + (missingCount - 1) * GAP_PX;
}

// One square per realization, colored by outcome (pulsing while its result is pending)
function RealizationSquares(props: RealizationSquaresProps) {
    const {
        matrixRuntime,
        checkName,
        allRealizations,
        runRealizations,
        results,
        isRunning,
        requestedRealizations,
        hasRun,
        onRealizationClick,
    } = props;

    const qcRealizationPopover = useQcRealizationPopover();
    // The popover is anchored to the whole grid, so it doesn't cover neighboring rows
    const containerRef = React.useRef<HTMLDivElement>(null);

    if (allRealizations.length === 0) {
        return null;
    }

    const runRealizationsSet = new Set(runRealizations);
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

    // "filteredAway": not part of the run. "excluded": part of the run, but failed an earlier step.
    function makeSquareColor(realization: number): RealizationStatusTone {
        if (!runRealizationsSet.has(realization)) {
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

                                const isInspectable = tone !== "loading" && tone !== "filteredAway";

                                function localHandleSquareClick(realization: number) {
                                    if (!isInspectable) {
                                        return;
                                    }
                                    handleSquareClick(realization);
                                }

                                return (
                                    <Tooltip key={realization} content={tooltipContent}>
                                        {/* `aria-disabled` rather than `disabled`, which would also stop the tooltip */}
                                        <button
                                            type="button"
                                            aria-label={tooltipContent}
                                            aria-disabled={!isInspectable}
                                            onClick={() => localHandleSquareClick(realization)}
                                            style={{ width: SQUARE_SIZE_PX, height: SQUARE_SIZE_PX, animationDelay }}
                                            className={resolveClassNames(
                                                "focusable flex items-center justify-center rounded-xs p-0",
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
                                        </button>
                                    </Tooltip>
                                );
                            })}
                            {group.length < REALIZATION_GROUP_SIZE && (
                                <div
                                    style={{
                                        width: makeGroupFillerWidthPx(REALIZATION_GROUP_SIZE - group.length),
                                        height: SQUARE_SIZE_PX,
                                    }}
                                />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
