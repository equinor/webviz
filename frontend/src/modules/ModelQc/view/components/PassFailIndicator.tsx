import type React from "react";

import { Check, Close } from "@mui/icons-material";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type PassFailIndicatorProps = {
    passed: boolean;
    passedLabel?: string;
    failedLabel?: string;
};

// Compact pass/fail indicator used in table cells, replacing hand-colored "yes"/"no" text.
export function PassFailIndicator(props: PassFailIndicatorProps): React.ReactNode {
    const { passed, passedLabel = "Yes", failedLabel = "No" } = props;

    return (
        <span
            className={resolveClassNames("inline-flex items-center gap-x-1 text-xs font-medium", {
                "text-green-600": passed,
                "text-red-600": !passed,
            })}
        >
            {passed ? <Check fontSize="inherit" /> : <Close fontSize="inherit" />}
            {passed ? passedLabel : failedLabel}
        </span>
    );
}
