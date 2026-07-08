import type React from "react";

import { UnfoldLessDouble, UnfoldMoreDouble } from "@mui/icons-material";

import { Button } from "@lib/components/Button";
import { Tooltip } from "@lib/components/Tooltip";

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
            <Tooltip content="Expand all descendants" side="bottom">
                <Button onClick={expandAllChildren} iconOnly variant="ghost" size="small" tone="neutral">
                    <UnfoldMoreDouble fontSize="inherit" />
                </Button>
            </Tooltip>
            <Tooltip content="Collapse all descendants" side="bottom">
                <Button onClick={collapseAllChildren} iconOnly variant="ghost" size="small" tone="neutral">
                    <UnfoldLessDouble fontSize="inherit" />
                </Button>
            </Tooltip>
        </>
    );
}
