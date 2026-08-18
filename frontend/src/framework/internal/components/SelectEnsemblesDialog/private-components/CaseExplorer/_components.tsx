import type React from "react";

import { useUserAvatar } from "@framework/internal/utils/useUserAvatar";
import { Avatar } from "@lib/components/Avatar";
import { TableCompositions } from "@lib/components/Table/compositions";
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
        <TableCompositions.CopyCellValue onCopyRequested={handleCopyRequested}>
            <div
                className="group relative flex h-full min-w-0 items-center"
                title={`${props.caseName} - ${props.caseId}`}
                data-case-uuid={props.caseId}
            >
                <div className="gap-x-2xs flex items-center overflow-hidden text-ellipsis whitespace-nowrap">
                    {props.caseName}
                    <span
                        className={resolveClassNames("text-body-xs text-neutral-subtle", {
                            "text-neutral-subtle-on-emphasis": props.cellRowSelected,
                        })}
                    >
                        - <span className="inline-block">{props.caseId}</span>
                    </span>
                </div>
            </div>
        </TableCompositions.CopyCellValue>
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
        <TableCompositions.CopyCellValue onCopyRequested={handleCopyRequested}>
            <div className="flex h-full min-w-0 items-center" title={props.description} data-case-uuid={props.caseId}>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">{props.description}</span>
            </div>
        </TableCompositions.CopyCellValue>
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
    const avatarSrc = useUserAvatar(`${props.author}@equinor.com`, props.author);

    return (
        <div className="gap-x-xs flex items-center" data-case-uuid={props.caseId}>
            <Avatar key={props.author} size={24} userData={avatarSrc} />
            <span className="block w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap" title={props.author}>
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
