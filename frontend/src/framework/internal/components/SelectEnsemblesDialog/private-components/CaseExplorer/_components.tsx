import React from "react";

import { ContentCopy, Done } from "@mui/icons-material";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

type CaseNameAndIdCellProps = {
    caseName: string;
    caseId: string;
    cellRowSelected: boolean;
};

export function CaseNameAndIdCell(props: CaseNameAndIdCellProps): React.ReactNode {
    const [copied, setCopied] = React.useState(false);

    function handleCopyClick(event: React.MouseEvent) {
        event.stopPropagation();

        if (copied) {
            return;
        }

        navigator.clipboard.writeText(`${props.caseId}`);
        setCopied(true);
    }

    function handleMouseLeave() {
        setCopied(false);
    }

    return (
        <div
            className="group relative flex items-center min-w-0"
            title={`${props.caseName} - ${props.caseId}`}
            onMouseLeave={handleMouseLeave}
        >
            {/* Text */}
            <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                {props.caseName}
                <span className={resolveClassNames("text-xs text-slate-500", { "text-white": props.cellRowSelected })}>
                    {" "}
                    - {props.caseId}
                </span>
            </div>

            {/* Copy (or Done) button, hidden until hover */}
            <button
                className={resolveClassNames(
                    `absolute right-1 px-1 w-6 h-6 text-slate-400 hover:text-slate-600
                     group-hover:bg-slate-100 rounded-full opacity-0 group-hover:opacity-100 
                    transition-opacity duration-200`,
                    { "active:bg-slate-400": !copied },
                )}
                title={copied ? "Copied!" : "Copy case uuid to clipboard"}
                onClick={handleCopyClick}
            >
                {!copied ? <ContentCopy fontSize="inherit" /> : <Done fontSize="inherit" />}
            </button>
        </div>
    );
}
