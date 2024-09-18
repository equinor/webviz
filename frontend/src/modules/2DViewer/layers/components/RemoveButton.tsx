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
            <div className="hover:cursor-pointer rounded hover:text-red-600" onClick={handleRemove} title="Remove item">
                <Delete fontSize="inherit" />
            </div>
        </>
    );
}
