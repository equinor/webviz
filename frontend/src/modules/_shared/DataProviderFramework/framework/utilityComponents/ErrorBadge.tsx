import { Warning } from "@mui/icons-material";

import { Tooltip } from "@lib/components/Tooltip";

export type ErrorBadgeProps = {
    numErrors: number;
    onClick?: () => void;
};

export function ErrorBadge(props: ErrorBadgeProps) {
    return (
        <Tooltip title={props.numErrors > 1 ? `${props.numErrors} errors` : "1 error"}>
            <div
                className="bg-red-200 rounded px-2 py-1 flex gap-2 items-center text-red-900 h-6 border border-red-400 whitespace-nowrap cursor-pointer"
                onClick={() => props.onClick?.()}
            >
                <Warning color="error" fontSize="small" />
                <span className="text-xs leading-0">{props.numErrors}</span>
            </div>
        </Tooltip>
    );
}
