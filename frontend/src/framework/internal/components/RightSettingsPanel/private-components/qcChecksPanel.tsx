import React from "react";

import { FactCheck, PlayArrow, PlaylistPlay, Stop, Verified } from "@mui/icons-material";

import { EnsembleColorTile } from "@framework/components/EnsembleColorTile";
import { Drawer } from "@framework/internal/components/Drawer";
import type { EnsembleQc } from "@framework/internal/QC/EnsembleQc";
import type { QcCheckRealizationResult, QcCheckRuntime } from "@framework/internal/QC/QcCheck";
import { QcCheckRuntimeTopic } from "@framework/internal/QC/QcCheck";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Tooltip } from "@lib/components/Tooltip";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useActiveSession } from "../../ActiveSessionBoundary";

export type QcChecksPanelProps = {
    workbench: Workbench;
    onClose: () => void;
};

export const QcChecksPanel = React.memo(function QcChecksPanel(props: QcChecksPanelProps) {
    const workbenchSession = useActiveSession();

    const ensembleQcs = workbenchSession.getEnsembleQcSet().getEnsembleQcsArray();

    return (
        <Drawer title="QC Checks" icon={<Verified />} visible={true} onClose={props.onClose}>
            {ensembleQcs.map((ensembleQc) => {
                const ensembleIdentString = ensembleQc.getEnsemble().getIdent().toString();
                return <EnsembleQcContainer key={ensembleIdentString} ensembleQc={ensembleQc} />;
            })}
        </Drawer>
    );
});

type EnsembleQcContainerProps = {
    ensembleQc: EnsembleQc;
};

function EnsembleQcContainer(props: EnsembleQcContainerProps) {
    const checkRuntimes = Array.from(props.ensembleQc.getCheckRuntimes().values());
    const ensemble = props.ensembleQc.getEnsemble();
    const realizations = ensemble.getRealizations();

    const readableEnsembleName = ensemble.getCustomName() ?? ensemble.getDisplayName();

    return (
        <div
            className={resolveClassNames(
                "group outline-neutral-subtle hover:outline-accent cursor-pointer rounded-md outline",
            )}
        >
            <div className="bg-neutral flex items-center justify-center rounded-t">
                <div className={resolveClassNames("px-2xs py-3xs gap-x-2xs flex h-full min-w-0 grow items-center")}>
                    <EnsembleColorTile wrapperClassName="w-5 h-5" ensemble={ensemble} />
                    <div className="font-bolder px-2xs text-body-sm flex h-full min-w-0 grow cursor-pointer items-center">
                        <span className="truncate">{readableEnsembleName}</span>
                    </div>
                    <Button tone="accent" size="small" variant="ghost" iconOnly>
                        <PlaylistPlay style={{ fontSize: 16 }} />
                    </Button>
                </div>
            </div>
            <div className="gap-y-2xs p-2xs flex flex-col">
                {checkRuntimes.map((checkRuntime) => (
                    <CheckRuntimeContainer
                        key={checkRuntime.getId()}
                        checkRuntime={checkRuntime}
                        realizations={realizations}
                    />
                ))}
            </div>
        </div>
    );
}

type CheckRuntimeContainerProps = {
    checkRuntime: QcCheckRuntime;
    realizations: readonly number[];
};

function CheckRuntimeContainer(props: CheckRuntimeContainerProps) {
    const { checkRuntime, realizations } = props;

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

    return (
        <div className="gap-y-2xs p-2xs flex flex-col">
            <div className="font-bolder text-body-sm gap-sm flex items-center">
                {isRunning ? <CircularProgress size={16} /> : <FactCheck style={{ fontSize: 16 }} />}
                <span className="grow">{checkDefinition.name}</span>
                <Button tone="accent" size="small" variant="ghost" iconOnly onClick={handleToggleRun}>
                    {isRunning ? <Stop style={{ fontSize: 16 }} /> : <PlayArrow style={{ fontSize: 16 }} />}
                </Button>
            </div>
            <RealizationSquares
                realizations={realizations}
                results={results}
                isRunning={isRunning}
                requestedRealizations={requestedRealizations}
            />
        </div>
    );
}

type RealizationStatusTone = "idle" | "success" | "danger";

const REALIZATION_STATUS_TONE_TO_CLASSNAME: Record<RealizationStatusTone, string> = {
    idle: "bg-neutral-strong",
    success: "bg-success-strong",
    danger: "bg-danger-strong",
};

type RealizationSquaresProps = {
    realizations: readonly number[];
    results: Map<number, QcCheckRealizationResult<unknown>>;
    isRunning: boolean;
    requestedRealizations: readonly number[];
};

// Realizations are grouped into rows of 5 with a row-start label, same layout as
// `EnsembleRealizationFilter`'s `RealizationNumberDisplay` - only the shape (square, colored by QC
// outcome) and the cell content (a spinner while a result is pending) differ.
const REALIZATION_GROUP_SIZE = 5;
const SQUARE_SIZE_PX = 12;
const GAP_PX = 4;
const LABEL_WIDTH_PX = 28;
const LABEL_HEIGHT_PX = 16;

// One small square per realization, colored by outcome. Realizations that are part of the
// currently running check but have not reported a result yet show a small spinner instead of a
// static square.
function RealizationSquares(props: RealizationSquaresProps) {
    const { realizations, results, isRunning, requestedRealizations } = props;

    if (realizations.length === 0) {
        return null;
    }

    const requestedRealizationsSet = new Set(requestedRealizations);
    const sortedRealizations = [...realizations].sort((a, b) => a - b);
    const numGroups = Math.ceil(sortedRealizations.length / REALIZATION_GROUP_SIZE);
    const groups = Array.from({ length: numGroups }, (_, g) =>
        sortedRealizations.slice(g * REALIZATION_GROUP_SIZE, g * REALIZATION_GROUP_SIZE + REALIZATION_GROUP_SIZE),
    );

    return (
        <div style={{ paddingLeft: LABEL_WIDTH_PX, paddingTop: LABEL_HEIGHT_PX }}>
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

                                if (isLoading) {
                                    return (
                                        <Tooltip key={realization} content={`Realization ${realization}: running…`}>
                                            <div className="flex items-center justify-center">
                                                <CircularProgress size={16} />
                                            </div>
                                        </Tooltip>
                                    );
                                }

                                const tone: RealizationStatusTone = !result
                                    ? "idle"
                                    : result.kind === "success"
                                      ? "success"
                                      : "danger";
                                const tooltipContent = !result
                                    ? `Realization ${realization}: not run`
                                    : result.kind === "success"
                                      ? `Realization ${realization}: success`
                                      : `Realization ${realization}: ${result.errorMessage}`;

                                return (
                                    <Tooltip key={realization} content={tooltipContent}>
                                        <div
                                            style={{ width: SQUARE_SIZE_PX, height: SQUARE_SIZE_PX }}
                                            className={resolveClassNames(
                                                "rounded-xs hover:outline",
                                                REALIZATION_STATUS_TONE_TO_CLASSNAME[tone],
                                            )}
                                        />
                                    </Tooltip>
                                );
                            })}
                            {Array.from({ length: REALIZATION_GROUP_SIZE - group.length }).map((_, i) => (
                                <div key={`placeholder-${i}`} style={{ width: SQUARE_SIZE_PX, height: SQUARE_SIZE_PX }} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
