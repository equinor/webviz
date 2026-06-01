import React from "react";

import { Edit } from "@mui/icons-material";

import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { ItemDelegateTopic } from "../../delegates/ItemDelegate";
import type { Item } from "../../interfacesAndTypes/entities";
import { TooltipCompositions } from "@lib/newComponents/Tooltip/compositions";

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
        <TooltipCompositions.Default content="Double-click to edit name" side="bottom">
            <div
                className="group/edit-name gap-horizontal-2xs font-bolder flex min-w-0 grow items-center overflow-hidden"
                onDoubleClick={handleNameDoubleClick}
            >
                {editingName ? (
                    <input
                        type="text"
                        className="w-full"
                        value={currentName}
                        onChange={handleNameChange}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        autoFocus
                    />
                ) : (
                    <>
                        <div className="min-w-0 grow overflow-hidden text-ellipsis whitespace-nowrap">{itemName}</div>
                        <Edit
                            fontSize="inherit"
                            className="cursor-pointer opacity-0 group-hover/edit-name:opacity-50"
                            onClick={handleNameDoubleClick}
                            titleAccess="Click to edit name"
                        />
                    </>
                )}
            </div>
        </TooltipCompositions.Default>
    );
}
