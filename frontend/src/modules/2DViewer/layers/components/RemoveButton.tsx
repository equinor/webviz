import { DenseIconButton } from "@lib/components/DenseIconButton";
import { DenseIconButtonColorScheme } from "@lib/components/DenseIconButton/denseIconButton";
import { Delete } from "@mui/icons-material";

import { Item } from "../interfaces";

export type RemoveButtonProps = {
    item: Item;
};

export function RemoveButton(props: RemoveButtonProps): React.ReactNode {
    function handleRemove() {
        const parentGroup = props.item.getItemDelegate().getParentGroup();
        if (parentGroup) {
            parentGroup.removeChild(props.item);
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
