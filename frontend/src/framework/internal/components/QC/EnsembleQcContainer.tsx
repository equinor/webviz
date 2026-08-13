import React from "react";

import {
    ExpandLess,
    ExpandMore,
    FactCheck,
    PlayArrow,
    PlaylistPlay,
    Replay,
    Stop,
    Troubleshoot,
} from "@mui/icons-material";
import { startCase } from "lodash-es";

import { EnsembleColorTile } from "@framework/components/EnsembleColorTile";
import { REALIZATION_ELEVATED_SETTING } from "@framework/ElevatedSettings/definitions/realization";
import { useElevatedSettingValue } from "@framework/ElevatedSettings/hooks";
import type { EnsembleQc } from "@framework/internal/QC/EnsembleQc";
import type { QcCheckRealizationResult, QcCheckRuntime } from "@framework/internal/QC/QcCheck";
import { QcCheckRuntimeTopic } from "@framework/internal/QC/QcCheck";
import type { Template } from "@framework/TemplateRegistry";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Menu } from "@lib/components/Menu";
import { Separator } from "@lib/components/Separator";
import { Tooltip } from "@lib/components/Tooltip";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useActiveDashboard } from "../ActiveDashboardBoundary";

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

export function EnsembleQcContainer(props: EnsembleQcContainerProps) {
    const checkRuntimes = Array.from(props.ensembleQc.getCheckRuntimes().values());
    const ensemble = props.ensembleQc.getEnsemble();
    const realizations = ensemble.getRealizations();
    const [expanded, setExpanded] = React.useState(false);

    const isAnyCheckRunning = useIsAnyCheckRuntimeRunning(checkRuntimes);

    const readableEnsembleName = ensemble.getCustomName() ?? ensemble.getDisplayName();

    return (
        <div className={resolveClassNames("group outline-neutral-subtle cursor-pointer outline")}>
            <div
                className="bg-neutral gap-xs p-2xs flex items-center justify-center"
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
                            checkRuntime={checkRuntime}
                            realizations={realizations}
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
    realizations: readonly number[];
    workbench: Workbench;
};

function CheckRuntimeContainer(props: CheckRuntimeContainerProps) {
    const { checkRuntime, realizations, workbench } = props;

    const [showSettings, setShowSettings] = React.useState(false);

    // Params are staged locally while the settings view is open, and only committed into the
    // runtime (via `setParams`) when the user clicks Run - there's no separate Apply step.
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

    // Re-renders whenever the runtime's results or running state change - see the
    // `notifySubscribers` calls in `QcCheckRuntime.run()`/`cancel()`.
    usePublishSubscribeTopicValue(checkRuntime, QcCheckRuntimeTopic.RESULTS);
    usePublishSubscribeTopicValue(checkRuntime, QcCheckRuntimeTopic.STATUS);

    const checkDefinition = checkRuntime.getCheckDefinition();
    const isRunning = checkRuntime.isRunning();
    const results = checkRuntime.getResults();
    const requestedRealizations = checkRuntime.getRequestedRealizations();
    // Shared by template resolution and `onTemplateApplied` - both need this run's realizations and
    // results, not the check in the abstract.
    const templateContext = { realizations: requestedRealizations, results };

    function handleRunClick() {
        checkRuntime.setParams(stagedParams);
        // Once `run()` flips `isRunning`, the settings view hides itself regardless of
        // `showSettings` - reset it now so a run started from the "no results yet" view doesn't
        // leave the re-run settings view showing once this run completes.
        setShowSettings(false);
        checkRuntime.run(realizations);
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
        const hasResults = results.size > 0;
        // Not-yet-run and re-run both land here: settings + a Play button, plus (only when there
        // are existing results to fall back to) a Cancel button to back out without running again.
        // `!isRunning` takes priority so this auto-hides the moment a run is kicked off, in favor of
        // the progress view below.
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
            const templates = checkDefinition.templates?.(templateContext) ?? [];

            return (
                <div className="p-2xs gap-2xs flex flex-col">
                    <CheckParamsList params={appliedParams} />
                    <Separator orientation="horizontal" />
                    <RealizationSquares
                        checkRuntime={checkRuntime}
                        checkName={checkDefinition.name}
                        realizations={realizations}
                        results={results}
                        isRunning={isRunning}
                        requestedRealizations={requestedRealizations}
                        selectedRealization={selectedRealization}
                        onRealizationClick={handleRealizationClick}
                    />
                    {!isRunning && (
                        <>
                            <Separator orientation="horizontal" />
                            <div className="gap-xs flex items-center justify-end">
                                <Button tone="neutral" size="small" variant="ghost" onClick={handleReRunClick}>
                                    <Replay style={{ fontSize: 16 }} />
                                    Re-run
                                </Button>
                                {templates.length > 0 && (
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
                                                        onClick={() => handleApplyTemplateClick(template)}
                                                    />
                                                ))}
                                            </Menu.Group>
                                        </Menu.Popup>
                                    </Menu.Root>
                                )}
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
            <div className="gap-xs bg-neutral/50 flex items-center">
                <div
                    className="font-bolder p-2xs text-body-sm gap-xs flex grow"
                    onClick={() => setExpanded((prev) => !prev)}
                >
                    {expanded ? <ExpandLess style={{ fontSize: 16 }} /> : <ExpandMore style={{ fontSize: 16 }} />}
                    {isRunning ? <CircularProgress size={16} /> : <FactCheck style={{ fontSize: 16 }} />}
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
                    <div className="p-2xs">{makeResultsContent()}</div>
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
    return JSON.stringify(value);
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

type RealizationStatusTone = "idle" | "loading" | "success" | "danger";

const REALIZATION_STATUS_TONE_TO_CLASSNAME: Record<RealizationStatusTone, string> = {
    idle: "bg-neutral-strong",
    loading: "bg-neutral/50 animate-pulse",
    success: "bg-success-strong",
    danger: "bg-danger-strong",
};

type RealizationSquaresProps = {
    checkRuntime: QcCheckRuntime;
    checkName: string;
    realizations: readonly number[];
    results: Map<number, QcCheckRealizationResult<unknown>>;
    isRunning: boolean;
    requestedRealizations: readonly number[];
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
// currently running check but have not reported a result yet show a pulsing skeleton square
// instead of a static one.
function RealizationSquares(props: RealizationSquaresProps) {
    const { checkRuntime, checkName, realizations, results, isRunning, requestedRealizations, onRealizationClick } =
        props;

    const qcRealizationPopover = useQcRealizationPopover();
    // Anchors the popover to the whole realization-squares grid for this check, rather than to an
    // individual square or row - anchoring to a single row overlapped neighboring rows since they
    // sit so close together.
    const containerRef = React.useRef<HTMLDivElement>(null);

    if (realizations.length === 0) {
        return null;
    }

    const requestedRealizationsSet = new Set(requestedRealizations);
    const sortedRealizations = [...realizations].sort((a, b) => a - b);
    const numGroups = Math.ceil(sortedRealizations.length / REALIZATION_GROUP_SIZE);
    const groups = Array.from({ length: numGroups }, (_, g) =>
        sortedRealizations.slice(g * REALIZATION_GROUP_SIZE, g * REALIZATION_GROUP_SIZE + REALIZATION_GROUP_SIZE),
    );

    function handleSquareClick(realization: number) {
        if (!containerRef.current) {
            return;
        }
        qcRealizationPopover.select({ checkRuntime, checkName, realization, anchorElement: containerRef.current });
        onRealizationClick(realization);
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
                                const result = results.get(realization);
                                const isLoading = !result && isRunning && requestedRealizationsSet.has(realization);

                                const tone: RealizationStatusTone = isLoading
                                    ? "loading"
                                    : !result
                                      ? "idle"
                                      : result.kind === "success"
                                        ? "success"
                                        : "danger";
                                const tooltipContent = isLoading
                                    ? `Realization ${realization}: running…`
                                    : !result
                                      ? `Realization ${realization}: not run`
                                      : result.kind === "success"
                                        ? `Realization ${realization}: success`
                                        : `Realization ${realization}: ${result.errorMessage}`;
                                const animationDelay = isLoading
                                    ? `${(realization % LOADING_ANIMATION_STAGGER_COUNT) * LOADING_ANIMATION_STAGGER_STEP_SECS}s`
                                    : undefined;

                                return (
                                    <Tooltip key={realization} content={tooltipContent}>
                                        <div
                                            onClick={() => handleSquareClick(realization)}
                                            style={{ width: SQUARE_SIZE_PX, height: SQUARE_SIZE_PX, animationDelay }}
                                            className={resolveClassNames(
                                                "cursor-pointer rounded-xs",
                                                { "hover:outline": !isLoading },
                                                {
                                                    "outline-accent outline-3 outline-double":
                                                        realization === props.selectedRealization,
                                                    "opacity-60":
                                                        realization !== props.selectedRealization && !isLoading,
                                                },
                                                REALIZATION_STATUS_TONE_TO_CLASSNAME[tone],
                                            )}
                                        />
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
