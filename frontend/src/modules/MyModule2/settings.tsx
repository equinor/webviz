import React from "react";

import { DragListGroup, DragListItem } from "@lib/components/DragList";
import { DragList } from "@lib/components/DragList/dragList";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";

import { useAtom } from "jotai";

import { textAtom } from "./atoms";

type Item = {
    id: string;
    type: "item" | "group";
    title: string;
    children: Item[];
};

export const Settings = () => {
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
    ]);

    function handleAtomTextChange(event: React.ChangeEvent<HTMLInputElement>) {
        setAtomText(event.target.value);
    }

    function handleItemMove(itemId: string, originId: string | null, destinationid: string | null, position: number) {
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
    }

    function makeChildren(items: Item[]): React.ReactElement[] {
        return items.map((item) => {
            if (item.type === "item") {
                return (
                    <DragListItem key={item.id} title={item.title} id={item.id}>
                        {item.title}
                    </DragListItem>
                );
            } else {
                return (
                    <DragListGroup
                        key={item.id}
                        title={item.title}
                        id={item.id}
                        contentWhenEmpty={<div className="p-2">No items</div>}
                    >
                        {makeChildren(item.children)}
                    </DragListGroup>
                );
            }
        });
    }

    return (
        <>
            <Label text="Atom text">
                <Input value={atomText} onChange={handleAtomTextChange} />
            </Label>
            <DragList contentWhenEmpty="No items" onItemMove={handleItemMove}>
                {makeChildren(items)}
            </DragList>
        </>
    );
};

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
