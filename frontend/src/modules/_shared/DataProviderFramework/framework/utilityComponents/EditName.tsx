import React from "react";

import { Edit } from "@mui/icons-material";

import { usePublishSubscribeTopicValue } from "../../../utils/PublishSubscribeDelegate";
import { ItemDelegateTopic } from "../../delegates/ItemDelegate";
import type { Item } from "../../interfacesAndTypes/entitites";

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
            className="grow font-bold flex items-center gap-2 group min-w-0 overflow-hidden"
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
                    <div className="grow min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{itemName}</div>
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
