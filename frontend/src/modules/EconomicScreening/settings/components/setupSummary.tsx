import type React from "react";

import {
    SetupIssueKind,
    type SetupField,
    type SetupIssue,
    type SetupReadiness,
} from "@modules/EconomicScreening/utils/setupReadiness";

export type SetupSummaryProps = {
    readiness: SetupReadiness;
    /** Lower-case name of the selected result, e.g. "net present value". */
    resultLabel: string;
    onIssueClick: (field: SetupField) => void;
};

export function SetupSummary(props: SetupSummaryProps): React.ReactNode {
    const inputIssues = props.readiness.issues.filter(
        (issue) => issue.kind === SetupIssueKind.INPUT && issue.field !== "earlyYear",
    );
    const sourceIssues = props.readiness.issues.filter((issue) => issue.kind === SetupIssueKind.SOURCE);
    const earlyIssues = props.readiness.issues.filter((issue) => issue.field === "earlyYear");
    const isComplete = !props.readiness.isLoading && props.readiness.issues.length === 0;
    const requiredCount = inputIssues.length + sourceIssues.length;

    function issueList(issues: SetupIssue[]) {
        return (
            <ul className="ml-md list-disc">
                {issues.map((issue) => (
                    <li key={issue.message}>
                        {issue.field ? (
                            <button
                                type="button"
                                className="focusable text-left underline"
                                onClick={() => props.onIssueClick(issue.field!)}
                            >
                                {issue.message}
                            </button>
                        ) : (
                            issue.message
                        )}
                    </li>
                ))}
            </ul>
        );
    }

    return (
        <div
            role="status"
            aria-label="Setup status"
            className="px-xs py-2xs text-body-xs gap-y-3xs flex max-h-[40%] shrink-0 flex-col overflow-y-auto border-b"
        >
            {props.readiness.issues.length > 0 && (
                <details>
                    <summary className="focusable cursor-pointer font-bold">
                        {inputIssues.length + sourceIssues.length > 0
                            ? `${requiredCount} ${requiredCount === 1 ? "issue" : "issues"} for ${props.resultLabel}${sourceIssues.length > 0 ? ` (${sourceIssues.length} source)` : ""}`
                            : "Optional early comparison"}
                        {earlyIssues.length > 0 &&
                            inputIssues.length + sourceIssues.length > 0 &&
                            `; ${earlyIssues.length} optional`}
                    </summary>
                    <div className="gap-y-3xs pt-2xs flex flex-col">
                        {inputIssues.length > 0 && (
                            <>
                                <span className="font-bold">Needed for {props.resultLabel}:</span>
                                {issueList(inputIssues)}
                            </>
                        )}
                        {sourceIssues.length > 0 && (
                            <>
                                <span className="text-danger font-bold">Source data:</span>
                                {issueList(sourceIssues)}
                            </>
                        )}
                        {earlyIssues.length > 0 && (
                            <>
                                <span className="font-bold">Optional early comparison (full results unchanged):</span>
                                {issueList(earlyIssues)}
                            </>
                        )}
                    </div>
                </details>
            )}
            {props.readiness.isLoading && <span className="text-subtle">Checking source data...</span>}
            {isComplete && <span className="text-subtle">Setup ready</span>}
        </div>
    );
}
