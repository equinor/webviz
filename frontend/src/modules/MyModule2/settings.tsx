import React from "react";

import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";

import { useAtom } from "jotai";

import { textAtom } from "./atoms";

export function Settings(): React.ReactNode {
    const [atomText, setAtomText] = useAtom(textAtom);

    function handleAtomTextChange(event: React.ChangeEvent<HTMLInputElement>) {
        setAtomText(event.target.value);
    }

    return (
        <>
            <Label text="Atom text">
                <Input value={atomText} onChange={handleAtomTextChange} />
            </Label>
        </>
    );
}

Settings.displayName = "Settings";
