import { Delete } from "@mui/icons-material";

import { Button } from "@lib/components/Button";
import { Tooltip } from "@lib/components/Tooltip";

import type { Item } from "../../interfacesAndTypes/entities";

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
            <Tooltip content="Remove item" side="bottom">
                <Button onClick={handleRemove} tone="danger" variant="ghost" size="small" iconOnly>
                    <Delete fontSize="inherit" />
                </Button>
            </Tooltip>
        </>
    );
}
