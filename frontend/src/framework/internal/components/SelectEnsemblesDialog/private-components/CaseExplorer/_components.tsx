import type React from "react";

import { fetchUserAvatar } from "@framework/internal/utils/fetchUserAvatar";
import { CopyCellValue } from "@lib/components/Table/column-components/CopyCellValue";
import { Avatar } from "@lib/newComponents/Avatar";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

/**
 * Component to render the case name and ID cell with copy functionality
 */
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
                className="group relative flex h-full min-w-0 items-center"
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

/**
 * Component to render the description cell with copy functionality
 */
type DescriptionCellProps = {
    description: string;
};
export function DescriptionCell(props: DescriptionCellProps): React.ReactNode {
    function handleCopyRequested() {
        return props.description;
    }

    return (
        <CopyCellValue onCopyRequested={handleCopyRequested}>
            <div className="flex h-full min-w-0 items-center" title={props.description}>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">{props.description}</span>
            </div>
        </CopyCellValue>
    );
}

/**
 * Component to render the author cell with user avatar and name
 */
type AuthorCellProps = {
    author: string;
};
export function AuthorCell(props: AuthorCellProps): React.ReactNode {
    return (
        <div className="flex justify-center gap-1">
            <Avatar size="small" image={fetchUserAvatar(`${props.author}@equinor.com`, props.author)} />
            <span className="block w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap" title={props.author}>
                {props.author}
            </span>
        </div>
    );
}
