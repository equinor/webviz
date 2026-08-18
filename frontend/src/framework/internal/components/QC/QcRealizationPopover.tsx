import React from "react";

import type { QcCheckStepMatrixRuntime } from "@framework/internal/QC/QcCheckStep";
import { QcCheckStepTopic } from "@framework/internal/QC/QcCheckStep";
import { Popover } from "@lib/components/Popover";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

export type QcRealizationSelection = {
    matrixRuntime: QcCheckStepMatrixRuntime;
    checkName: string;
    realization: number;
    // The clicked realization's own check row - the popover anchors here (rather than to the
    // individual square) so it never covers the realization grid it's describing.
    anchorElement: HTMLElement;
};

type QcRealizationPopoverContextValue = {
    select: (selection: QcRealizationSelection) => void;
};

const QcRealizationPopoverContext = React.createContext<QcRealizationPopoverContextValue | null>(null);

// Lets a `RealizationSquares` instance anywhere in the QC checks drawer open the single, shared
// realization-result popover owned by `QcRealizationPopoverProvider`.
export function useQcRealizationPopover(): QcRealizationPopoverContextValue {
    const context = React.useContext(QcRealizationPopoverContext);
    if (!context) {
        throw new Error("useQcRealizationPopover must be used within a QcRealizationPopoverProvider");
    }
    return context;
}

export type QcRealizationPopoverProviderProps = {
    children: React.ReactNode;
};

export function QcRealizationPopoverProvider(props: QcRealizationPopoverProviderProps): React.ReactNode {
    const [selection, setSelection] = React.useState<QcRealizationSelection | null>(null);

    const contextValue = React.useMemo<QcRealizationPopoverContextValue>(() => ({ select: setSelection }), []);

    function handleOpenChange(open: boolean) {
        if (!open) {
            setSelection(null);
        }
    }

    return (
        <QcRealizationPopoverContext.Provider value={contextValue}>
            {props.children}
            <Popover.Root open={selection !== null} onOpenChange={handleOpenChange}>
                <Popover.Popup anchor={selection?.anchorElement} side="left">
                    {selection && (
                        <>
                            <Popover.Title>{`Realization ${selection.realization}`}</Popover.Title>
                            <Popover.Content as="div">
                                <QcRealizationResultDetails selection={selection} />
                            </Popover.Content>
                        </>
                    )}
                </Popover.Popup>
            </Popover.Root>
        </QcRealizationPopoverContext.Provider>
    );
}

// A dedicated component (rather than inlined) so its topic subscriptions only exist while a
// realization is actually selected - it re-subscribes to the *selected* matrix coordinate's own
// runtime, so the popover's content keeps updating live if that coordinate is still running when
// opened.
function QcRealizationResultDetails(props: { selection: QcRealizationSelection }): React.ReactNode {
    const { matrixRuntime, realization } = props.selection;

    usePublishSubscribeTopicValue(matrixRuntime, QcCheckStepTopic.RESULTS);
    usePublishSubscribeTopicValue(matrixRuntime, QcCheckStepTopic.STATUS);

    const result = matrixRuntime.getResults().get(realization);
    const isRunning = matrixRuntime.isRunning();
    const isLoading = !result && isRunning && matrixRuntime.getRequestedRealizations().includes(realization);

    if (isLoading) {
        return <span className="text-neutral-subtle text-body-sm">Running…</span>;
    }
    if (!result) {
        return <span className="text-neutral-subtle text-body-sm">This realization has not been checked yet.</span>;
    }
    if (result.kind === "exception") {
        return <span className="text-danger-subtle text-body-sm">{result.errorMessage}</span>;
    }

    const ResultComponent = matrixRuntime.getStepDefinition().resultComponent;
    const metricsContent = ResultComponent ? (
        <ResultComponent metrics={result.metrics} />
    ) : (
        <pre className="text-body-xs max-h-64 max-w-80 overflow-auto break-all whitespace-pre-wrap">
            {JSON.stringify(result.metrics, null, 2)}
        </pre>
    );

    // A "failure" still carries `metrics` (same as "success") - show why it failed alongside them,
    // rather than in place of them.
    if (result.kind === "failure") {
        return (
            <div className="gap-3xs flex flex-col">
                <span className="text-danger-subtle text-body-sm">{result.reason}</span>
                {metricsContent}
            </div>
        );
    }
    return metricsContent;
}
