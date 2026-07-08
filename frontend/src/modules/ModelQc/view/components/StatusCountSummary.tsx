import type React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { StatusCounts } from "../utils/statusCounts";

export type StatusCountSummaryProps = {
    counts: StatusCounts;
};

function CountChip(props: { dotClassName: string; label: string; count: number; emphasize?: boolean }): React.ReactNode {
    return (
        <span
            className={resolveClassNames("inline-flex items-center gap-x-1 whitespace-nowrap", {
                "font-semibold text-red-700": Boolean(props.emphasize),
                "text-gray-600": !props.emphasize,
            })}
        >
            <span className={resolveClassNames("inline-block h-2 w-2 rounded-full", props.dotClassName)} />
            {props.count} {props.label}
        </span>
    );
}

// Compact, high-level pass/fail overview. Rendered in the section header so the number of failed
// realizations is visible at a glance even when the section is collapsed.
export function StatusCountSummary(props: StatusCountSummaryProps): React.ReactNode {
    const { counts } = props;

    return (
        <div className="flex items-center gap-x-md text-xs">
            <CountChip dotClassName="bg-red-500" label="failed" count={counts.failed} emphasize={counts.failed > 0} />
            <CountChip dotClassName="bg-green-500" label="passed" count={counts.passed} />
            {counts.notEvaluated > 0 && (
                <CountChip dotClassName="bg-gray-400" label="not evaluated" count={counts.notEvaluated} />
            )}
        </div>
    );
}
