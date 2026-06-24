import type React from "react";

import { UserAvatar } from "@framework/internal/components/UserAvatar";
import { CopyCellValue } from "@lib/components/Table/column-components/CopyCellValue";
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
                className="h-full group relative flex items-center min-w-0"
                title={`${props.caseName} - ${props.caseId}`}
                data-case-uuid={props.caseId}
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
    caseId: string;
};
export function DescriptionCell(props: DescriptionCellProps): React.ReactNode {
    function handleCopyRequested() {
        return props.description;
    }

    return (
        <CopyCellValue onCopyRequested={handleCopyRequested}>
            <div className="flex h-full items-center min-w-0" title={props.description} data-case-uuid={props.caseId}>
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
    caseId: string;
};
export function AuthorCell(props: AuthorCellProps): React.ReactNode {
    return (
        <div className="flex justify-center gap-1" data-case-uuid={props.caseId}>
            <UserAvatar userIdOrEmail={`${props.author}@equinor.com`} />
            <span className="min-w-0 text-ellipsis overflow-hidden whitespace-nowrap w-full block" title={props.author}>
                {props.author}
            </span>
        </div>
    );
}

/**
 * Component to render a nullable text cell (e.g. model name / revision)
 */
type NullableTextCellProps = {
    value: string | null;
    caseId: string;
};
export function NullableTextCell(props: NullableTextCellProps): React.ReactNode {
    const text = props.value ?? "";
    return (
        <div className="overflow-hidden text-ellipsis whitespace-nowrap" title={text} data-case-uuid={props.caseId}>
            {text}
        </div>
    );
}
