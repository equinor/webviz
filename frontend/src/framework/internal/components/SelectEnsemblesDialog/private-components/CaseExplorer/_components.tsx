import React from "react";

import { useUserAvatar } from "@framework/internal/utils/useUserAvatar";
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

    const highlightRef = React.useRef<HTMLSpanElement>(null);

    return (
        <CopyCellValue onCopyRequested={handleCopyRequested} highlightRef={highlightRef}>
            <div
                className="group relative flex h-full min-w-0 items-center"
                title={`${props.caseName} - ${props.caseId}`}
            >
                <div className="gap-x-2xs flex items-center overflow-hidden text-ellipsis whitespace-nowrap">
                    {props.caseName}
                    <span
                        className={resolveClassNames("text-body-xs text-neutral-subtle", {
                            "text-neutral-subtle-on-emphasis": props.cellRowSelected,
                        })}
                    >
                        -{" "}
                        <span ref={highlightRef} className="inline-block">
                            {props.caseId}
                        </span>
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
    const avatarSrc = useUserAvatar(`${props.author}@equinor.com`, props.author);

    return (
        <div className="gap-x-xs flex items-center">
            <Avatar key={props.author} size={24} userData={avatarSrc} />
            <span className="block w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap" title={props.author}>
                {props.author}
            </span>
        </div>
    );
}
