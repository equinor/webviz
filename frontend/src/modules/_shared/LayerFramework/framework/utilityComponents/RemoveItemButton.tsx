import { DenseIconButton } from "@lib/components/DenseIconButton";
import { DenseIconButtonColorScheme } from "@lib/components/DenseIconButton/denseIconButton";
import { Delete } from "@mui/icons-material";

import { Item, instanceofLayer } from "../../interfaces";

export type RemoveItemButtonProps = {
    item: Item;
};

export function RemoveItemButton(props: RemoveItemButtonProps): React.ReactNode {
    function handleRemove() {
        const parentGroup = props.item.getItemDelegate().getParentGroup();
        if (parentGroup) {
            parentGroup.removeChild(props.item);
        }

        if (instanceofLayer(props.item)) {
            props.item.getLayerDelegate().beforeDestroy();
        }
    }

    return (
        <>
            <DenseIconButton onClick={handleRemove} title="Remove item" colorScheme={DenseIconButtonColorScheme.DANGER}>
                <Delete fontSize="inherit" />
            </DenseIconButton>
        </>
    );
}
