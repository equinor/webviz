import type React from "react";

import { SetupIssueKind, type SetupReadiness } from "@modules/EconomicScreening/utils/setupReadiness";

export type SetupSummaryProps = {
    readiness: SetupReadiness;
    /** Lower-case name of the selected result, e.g. "net present value". */
    resultLabel: string;
};

export function SetupSummary(props: SetupSummaryProps): React.ReactNode {
    const inputIssues = props.readiness.issues.filter((issue) => issue.kind === SetupIssueKind.INPUT);
    const sourceIssues = props.readiness.issues.filter((issue) => issue.kind === SetupIssueKind.SOURCE);
    const isComplete = !props.readiness.isLoading && props.readiness.issues.length === 0;

    return (
        <div
            role="status"
            aria-label="Setup status"
            className="px-xs py-2xs text-body-xs gap-y-3xs col-span-3 flex flex-col border-b"
        >
            {inputIssues.length > 0 && (
                <>
                    <span className="font-bold">Needed for {props.resultLabel}:</span>
                    <ul className="ml-md list-disc">
                        {inputIssues.map((issue) => (
                            <li key={issue.message}>{issue.message}</li>
                        ))}
                    </ul>
                </>
            )}
            {sourceIssues.length > 0 && (
                <>
                    <span className="text-danger font-bold">Source data:</span>
                    <ul className="ml-md text-danger list-disc">
                        {sourceIssues.map((issue) => (
                            <li key={issue.message}>{issue.message}</li>
                        ))}
                    </ul>
                </>
            )}
            {props.readiness.isLoading && <span className="text-subtle">Checking source data...</span>}
            {isComplete && <span className="text-subtle">All known inputs for {props.resultLabel} are set.</span>}
        </div>
    );
}
