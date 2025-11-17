import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { CopyCellValue } from "@lib/components/Table/column-components/CopyCellValue";

type CaseNameAndIdCellProps = {
    caseName: string;
    caseId: string;
    cellRowSelected: boolean;
};

export function CaseNameAndIdCell(props: CaseNameAndIdCellProps): React.ReactNode {
    function handleCopyRequested() {
        return props.caseId;
    }

    return (
        <CopyCellValue onCopyRequested={handleCopyRequested}>
            <div
                className="h-full group relative flex items-center min-w-0"
                title={`${props.caseName} - ${props.caseId}`}
            >
                <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                    {props.caseName}
                    <span
                        className={resolveClassNames("text-xs text-slate-500", { "text-white": props.cellRowSelected })}
                    >
                        {" "}
                        - {props.caseId}
                    </span>
                </div>
            </div>
        </CopyCellValue>
    );
}
