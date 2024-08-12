import React from "react";

import { DragListContainer, DragListItem } from "@lib/components/DragList";
import { DragList } from "@lib/components/DragList/dragList";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";

import { useAtom } from "jotai";

import { textAtom } from "./atoms";

export const Settings = () => {
    const [atomText, setAtomText] = useAtom(textAtom);

    function handleAtomTextChange(event: React.ChangeEvent<HTMLInputElement>) {
        setAtomText(event.target.value);
    }

    return (
        <>
            <Label text="Atom text">
                <Input value={atomText} onChange={handleAtomTextChange} />
            </Label>
            <DragList contentWhenEmpty="No items">
                <DragListItem title="Item 1" id="1">
                    Item 1
                </DragListItem>
                <DragListItem title="Item 2" id="2">
                    Item 2
                </DragListItem>
                <DragListContainer title="Container 1" id="3">
                    <DragListItem title="Item 3" id="4">
                        Item 3
                    </DragListItem>
                    <DragListItem title="Item 4" id="5">
                        Item 4
                    </DragListItem>
                </DragListContainer>
            </DragList>
        </>
    );
};

Settings.displayName = "Settings";
