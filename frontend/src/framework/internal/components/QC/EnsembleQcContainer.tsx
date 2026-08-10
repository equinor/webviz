import React from "react";

import {
    Check,
    Clear,
    ExpandLess,
    ExpandMore,
    FactCheck,
    PlayArrow,
    PlaylistPlay,
    Stop,
    Verified,
} from "@mui/icons-material";
import { isEqual } from "lodash-es";

import { EnsembleColorTile } from "@framework/components/EnsembleColorTile";
import { Drawer } from "@framework/internal/components/Drawer";
import type { EnsembleQc } from "@framework/internal/QC/EnsembleQc";
import type { QcCheckRealizationResult, QcCheckRuntime } from "@framework/internal/QC/QcCheck";
import { QcCheckRuntimeTopic } from "@framework/internal/QC/QcCheck";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { HasChangesIndicator } from "@lib/components/HasChangesIndicator/hasChangesIndicator";
import { Tooltip } from "@lib/components/Tooltip";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useQcRealizationPopover } from "./QcRealizationPopover";

type EnsembleQcContainerProps = {
    ensembleQc: EnsembleQc;
};

export function EnsembleQcContainer(props: EnsembleQcContainerProps) {
    const checkRuntimes = Array.from(props.ensembleQc.getCheckRuntimes().values());
    const ensemble = props.ensembleQc.getEnsemble();
    const realizations = ensemble.getRealizations();
    const [expanded, setExpanded] = React.useState(false);

    const readableEnsembleName = ensemble.getCustomName() ?? ensemble.getDisplayName();

    return (
        <div className={resolveClassNames("group outline-neutral-subtle cursor-pointer outline")}>
            <div
                className="bg-neutral gap-xs p-2xs flex items-center justify-center"
                onClick={() => setExpanded((prev) => !prev)}
            >
                {expanded ? <ExpandLess style={{ fontSize: 16 }} /> : <ExpandMore style={{ fontSize: 16 }} />}
                <EnsembleColorTile wrapperClassName="w-5 h-5" ensemble={ensemble} />
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
};

function CheckRuntimeContainer(props: CheckRuntimeContainerProps) {
    const { checkRuntime, realizations } = props;

    const [expanded, setExpanded] = React.useState(false);

    // Re-renders whenever the runtime's results or running state change - see the
    // `notifySubscribers` calls in `QcCheckRuntime.run()`/`cancel()`.
    usePublishSubscribeTopicValue(checkRuntime, QcCheckRuntimeTopic.RESULTS);
    usePublishSubscribeTopicValue(checkRuntime, QcCheckRuntimeTopic.STATUS);

    const checkDefinition = checkRuntime.getCheckDefinition();
    const isRunning = checkRuntime.isRunning();
    const results = checkRuntime.getResults();
    const requestedRealizations = checkRuntime.getRequestedRealizations();

    function handleToggleRun() {
        if (isRunning) {
            checkRuntime.cancel();
        } else {
            checkRuntime.run(realizations);
        }
    }

    function makeResultsContent() {
        if (isRunning || results.size > 0) {
            return (
                <RealizationSquares
                    checkRuntime={checkRuntime}
                    checkName={checkDefinition.name}
                    realizations={realizations}
                    results={results}
                    isRunning={isRunning}
                    requestedRealizations={requestedRealizations}
                />
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
                <div className="p-2xs">
                    <Button tone="accent" size="small" variant="ghost" iconOnly onClick={handleToggleRun}>
                        {isRunning ? <Stop style={{ fontSize: 16 }} /> : <PlayArrow style={{ fontSize: 16 }} />}
                    </Button>
                </div>
            </div>
            {expanded && (
                <>
                    {checkDefinition.settingsComponent && <CheckSettings checkRuntime={checkRuntime} />}
                    <div className="p-2xs">{makeResultsContent()}</div>
                </>
            )}
        </div>
    );
}

type CheckSettingsProps = {
    checkRuntime: QcCheckRuntime;
};

// Renders a check's own `settingsComponent` against a locally staged copy of its params, only
// committing into the runtime (via `setParams`) when Apply is clicked - mirrors the stage-then-
// apply UX of `EnsembleRealizationFilter`.
function CheckSettings(props: CheckSettingsProps) {
    const { checkRuntime } = props;

    const appliedParams = usePublishSubscribeTopicValue(checkRuntime, QcCheckRuntimeTopic.PARAMS);
    const [stagedParams, setStagedParams] = React.useState(appliedParams);

    const SettingsComponent = checkRuntime.getCheckDefinition().settingsComponent;
    if (!SettingsComponent) {
        return null;
    }

    const hasUnappliedChanges = !isEqual(stagedParams, appliedParams);

    function handleApplyClick() {
        checkRuntime.setParams(stagedParams);
    }

    function handleDiscardClick() {
        setStagedParams(appliedParams);
    }

    return (
        <div className="border-neutral-subtle p-2xs gap-2xs flex flex-col border-b">
            <SettingsComponent
                ensemble={checkRuntime.getEnsemble()}
                params={stagedParams}
                onParamsChange={setStagedParams}
            />
            <div className="gap-xs flex items-center justify-end">
                <HasChangesIndicator visible={hasUnappliedChanges} tooltip="You have unapplied changes" size={16} />
                <Button
                    tone="accent"
                    disabled={!hasUnappliedChanges}
                    onClick={handleApplyClick}
                    title={hasUnappliedChanges ? "Apply changes" : "No changes to apply"}
                    size="small"
                    variant="ghost"
                    iconOnly
                >
                    <Check style={{ fontSize: 16 }} />
                </Button>
                <Button
                    tone="danger"
                    disabled={!hasUnappliedChanges}
                    onClick={handleDiscardClick}
                    title={hasUnappliedChanges ? "Discard changes" : "No changes to discard"}
                    size="small"
                    variant="ghost"
                    iconOnly
                >
                    <Clear style={{ fontSize: 16 }} />
                </Button>
            </div>
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
    const { checkRuntime, checkName, realizations, results, isRunning, requestedRealizations } = props;

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
