import type React from "react";

import { DenseIconButton } from "@lib/components/DenseIconButton";
import { UnfoldLessDouble, UnfoldMoreDouble } from "@mui/icons-material";

import type { ItemGroup } from "../../interfacesAndTypes/entities";

export type ExpandCollapseAllButtonProps = {
    group: ItemGroup;
};

export function ExpandCollapseAllButton(props: ExpandCollapseAllButtonProps): React.ReactNode {
    function expandAllChildren() {
        const descendants = props.group.getGroupDelegate().getDescendantItems(() => true);
        for (const child of descendants) {
            child.getItemDelegate().setExpanded(true);
        }
    }

    function collapseAllChildren() {
        const descendants = props.group.getGroupDelegate().getDescendantItems(() => true);
        for (const child of descendants) {
            child.getItemDelegate().setExpanded(false);
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
