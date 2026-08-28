import { Warning } from "@mui/icons-material";

import { Tooltip } from "@lib/components/Tooltip";

export type ErrorBadgeProps = {
    numErrors: number;
    onClick?: () => void;
};

export function ErrorBadge(props: ErrorBadgeProps) {
    return (
        <Tooltip content={`${props.numErrors > 1 ? `${props.numErrors} errors` : "1 error"} - click to view`}>
            <div
                className="bg-danger px-2xs py-4xs gap-2xs text-danger-subtle border-danger flex h-5 cursor-pointer items-center rounded border whitespace-nowrap"
                onClick={() => props.onClick?.()}
            >
                <Warning color="error" style={{ fontSize: 16 }} />
                <span className="text-body-xs leading-0">{props.numErrors}</span>
            </div>
        </Tooltip>
    );
}
