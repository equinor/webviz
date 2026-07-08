import type React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { QcCheckStatus } from "../../typesAndEnums";
import { QcCheckStatusToColorClassMapping, QcCheckStatusToStringMapping } from "../../typesAndEnums";

export type StatusBadgeProps = {
    status: QcCheckStatus;
};

export function StatusBadge(props: StatusBadgeProps): React.ReactNode {
    return (
        <span
            className={resolveClassNames(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white",
                QcCheckStatusToColorClassMapping[props.status],
            )}
        >
            {QcCheckStatusToStringMapping[props.status]}
        </span>
    );
}
