import { Delete } from "@mui/icons-material";

import { Button } from "@lib/newComponents/Button";

import type { Item } from "../../interfacesAndTypes/entities";
import { TooltipCompositions } from "@lib/newComponents/Tooltip/compositions";

export type RemoveItemButtonProps = {
    item: Item;
};

export function RemoveItemButton(props: RemoveItemButtonProps): React.ReactNode {
    function handleRemove() {
        const parentGroup = props.item.getItemDelegate().getParentGroup();
        if (parentGroup) {
            parentGroup.removeChild(props.item);
        }

        props.item.beforeDestroy?.();
    }

    return (
        <>
            <TooltipCompositions.Default content="Remove item" side="bottom">
                <Button onClick={handleRemove} tone="danger" variant="ghost" size="small" iconOnly>
                    <Delete fontSize="inherit" />
                </Button>
            </TooltipCompositions.Default>
        </>
    );
}
