import type React from "react";

import { UnfoldLessDouble, UnfoldMoreDouble } from "@mui/icons-material";

import { Button } from "@lib/newComponents/Button";

import type { ItemGroup } from "../../interfacesAndTypes/entities";

export type ExpandCollapseAllButtonProps = {
    group: ItemGroup;
};

export function ExpandCollapseAllButton(props: ExpandCollapseAllButtonProps): React.ReactNode {
    function expandAllChildren() {
        props.group.getItemDelegate().setExpanded(true);
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
            <Button
                onClick={expandAllChildren}
                title="Expand all descendants"
                iconOnly
                variant="text"
                size="small"
                tone="neutral"
            >
                <UnfoldMoreDouble fontSize="inherit" />
            </Button>
            <Button
                onClick={collapseAllChildren}
                title="Collapse all descendants"
                iconOnly
                variant="text"
                size="small"
                tone="neutral"
            >
                <UnfoldLessDouble fontSize="inherit" />
            </Button>
        </>
    );
}
