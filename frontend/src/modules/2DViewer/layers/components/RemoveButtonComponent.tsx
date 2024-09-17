import { Delete } from "@mui/icons-material";

import { Item } from "../interfaces";

export type RemoveButtonComponentProps = {
    item: Item;
};

export function RemoveButtonComponent(props: RemoveButtonComponentProps): React.ReactNode {
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
