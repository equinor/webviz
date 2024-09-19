import React from "react";

import { DenseIconButton } from "@lib/components/DenseIconButton";
import { UnfoldLessDouble, UnfoldMoreDouble } from "@mui/icons-material";

import { Group } from "../interfaces";

export type ExpandCollapseAllButtonProps = {
    group: Group;
};

export function ExpandCollapseAllButton(props: ExpandCollapseAllButtonProps): React.ReactNode {
    function expandAllChildren() {
        const descendants = props.group.getGroupDelegate().getDescendantItems(() => true);
        for (const child of descendants) {
            child.getItemDelegate().setIsExpanded(true);
        }
    }

    function collapseAllChildren() {
        const descendants = props.group.getGroupDelegate().getDescendantItems(() => true);
        for (const child of descendants) {
            child.getItemDelegate().setIsExpanded(false);
        }
    }

    return (
        <>
            <DenseIconButton onClick={expandAllChildren} title="Expand all descendants">
                <UnfoldMoreDouble fontSize="inherit" />
            </DenseIconButton>
            <DenseIconButton onClick={collapseAllChildren} title="Collapse all descendants">
                <UnfoldLessDouble fontSize="inherit" />
            </DenseIconButton>
        </>
    );
}
