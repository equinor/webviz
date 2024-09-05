import React from "react";

import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";

import { useAtom } from "jotai";

import { persistentTextSettingAtom, textAtom } from "./atoms";

export function Settings(): React.ReactNode {
    const [atomText, setAtomText] = useAtom(textAtom);

    const [persistentText, setPersistentText] = useAtom(persistentTextSettingAtom);

    function handleAtomTextChange(event: React.ChangeEvent<HTMLInputElement>) {
        setAtomText(event.target.value);
    }

    return (
        <>
            <Label text="Atom text">
                <Input value={atomText} onChange={handleAtomTextChange} />
            </Label>

            <Label text="Persistent atom text">
                <Input value={persistentText} onChange={({ target }) => setPersistentText(target.value)} />
            </Label>
        </>
    );
}

Settings.displayName = "Settings";
