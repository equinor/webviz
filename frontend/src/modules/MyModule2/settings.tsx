import React from "react";

import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { SortableListGroup, SortableListItem } from "@lib/components/SortableList";
import { SortableList } from "@lib/components/SortableList/sortableList";

import { useAtom } from "jotai";

import { persistentTextSettingAtom, textAtom } from "./atoms";

type Item = {
    id: string;
    type: "item" | "group";
    title: string;
    children: Item[];
};

export function Settings(): React.ReactNode {
    const [atomText, setAtomText] = useAtom(textAtom);
    const [items, setItems] = React.useState<Item[]>([
        {
            id: "1",
            type: "item",
            title: "Item 1",
            children: [],
        },
        {
            id: "2",
            type: "item",
            title: "Item 2",
            children: [],
        },
        {
            id: "3",
            type: "group",
            title: "Group 1",
            children: [
                {
                    id: "4",
                    type: "item",
                    title: "Item 3",
                    children: [],
                },
                {
                    id: "5",
                    type: "item",
                    title: "Item 4",
                    children: [],
                },
            ],
        },
        {
            id: "6",
            type: "item",
            title: "Item 5",
            children: [],
        },
        {
            id: "7",
            type: "group",
            title: "Group 2",
            children: [
                {
                    id: "8",
                    type: "item",
                    title: "Item 6",
                    children: [],
                },
                {
                    id: "9",
                    type: "item",
                    title: "Item 7",
                    children: [],
                },
                {
                    id: "10",
                    type: "group",
                    title: "Group 3",
                    children: [
                        {
                            id: "11",
                            type: "item",
                            title: "Item 8",
                            children: [],
                        },
                    ],
                },
            ],
        },
    ]);

    const [persistentText, setPersistentText] = useAtom(persistentTextSettingAtom);

    function handleAtomTextChange(event: React.ChangeEvent<HTMLInputElement>) {
        setAtomText(event.target.value);
    }

    const handleItemMove = React.useCallback(
        function handleItemMove(
            itemId: string,
            originId: string | null,
            destinationid: string | null,
            position: number
        ) {
            const newItems = [...items];

            const item = findItemById(itemId, newItems);
            if (!item) {
                return;
            }

            const origin = originId ? findItemById(originId, newItems) : null;
            let originArr: Item[] = [];
            if (origin) {
                originArr = origin.children;
            } else {
                originArr = newItems;
            }

            const destination = findItemById(destinationid!, newItems);
            let destinationArr: Item[] = [];
            if (destination) {
                destinationArr = destination.children;
            } else {
                destinationArr = newItems;
            }

            originArr.splice(
                originArr.findIndex((i) => i.id === itemId),
                1
            );

            if (position === -1) {
                destinationArr.unshift(item);
            } else {
                destinationArr.splice(position, 0, item);
            }

            setItems(newItems);
        },
        [items]
    );

    function makeChildren(items: Item[]): React.ReactElement[] {
        return items.map((item) => {
            if (item.type === "item") {
                return (
                    <SortableListItem key={item.id} title={item.title} id={item.id}>
                        {item.title}
                    </SortableListItem>
                );
            } else {
                return (
                    <SortableListGroup
                        key={item.id}
                        title={item.title}
                        id={item.id}
                        contentWhenEmpty={<div className="p-2">No items</div>}
                    >
                        {makeChildren(item.children)}
                    </SortableListGroup>
                );
            }
        });
    }

    return (
        <>
            <Label text="Atom text">
                <Input value={atomText} onChange={handleAtomTextChange} />
            </Label>

            <Label text="Persistent atom text">
                <Input value={persistentText} onChange={({ target }) => setPersistentText(target.value)} />
            </Label>

            <div className="h-96">
                <SortableList contentWhenEmpty="No items" onItemMoved={handleItemMove}>
                    {makeChildren(items)}
                </SortableList>
            </div>
        </>
    );
}

Settings.displayName = "Settings";

function findItemById(id: string, items: Item[]): Item | null {
    for (const item of items) {
        if (item.id === id) {
            return item;
        }
        if (item.children.length > 0) {
            const foundItem = findItemById(id, item.children);
            if (foundItem) {
                return foundItem;
            }
        }
    }
    return null;
}
