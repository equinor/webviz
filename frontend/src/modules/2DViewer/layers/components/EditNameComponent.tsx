import React from "react";

import { usePublishSubscribeTopicValue } from "../PublishSubscribeHandler";
import { ItemDelegateTopic } from "../delegates/ItemDelegate";
import { Item } from "../interfaces";

type EditItemNameComponentProps = {
    item: Item;
};

export function EditNameComponent(props: EditItemNameComponentProps): React.ReactNode {
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
            className="flex-grow font-bold flex items-center pt-1"
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
                itemName
            )}
        </div>
    );
}
