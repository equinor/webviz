import React from "react";

import { Edit } from "@mui/icons-material";

import { ItemDelegateTopic } from "../delegates/ItemDelegate";
import { usePublishSubscribeTopicValue } from "../delegates/PublishSubscribeDelegate";
import { Item } from "../interfaces";

type EditItemNameProps = {
    item: Item;
};

export function EditName(props: EditItemNameProps): React.ReactNode {
    const itemName = usePublishSubscribeTopicValue(props.item.getItemDelegate(), ItemDelegateTopic.NAME);

    const [editingName, setEditingName] = React.useState<boolean>(false);
    const [currentName, setCurrentName] = React.useState<string>(itemName);

    function handleNameDoubleClick() {
        setEditingName(true);
    }

    function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        setCurrentName(e.target.value);
    }

    function handleBlur() {
        setEditingName(false);
        props.item.getItemDelegate().setName(currentName);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter") {
            setEditingName(false);
            props.item.getItemDelegate().setName(currentName);
        }
    }

    return (
        <div
            className="flex-grow font-bold flex items-center gap-2 group"
            onDoubleClick={handleNameDoubleClick}
            title="Double-click to edit name"
        >
            {editingName ? (
                <input
                    type="text"
                    className="p-0.5 w-full"
                    value={currentName}
                    onChange={handleNameChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    autoFocus
                />
            ) : (
                <>
                    {itemName}
                    <Edit
                        fontSize="inherit"
                        className="opacity-0 group-hover:opacity-50 cursor-pointer"
                        onClick={handleNameDoubleClick}
                    />
                </>
            )}
        </div>
    );
}
