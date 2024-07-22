import React from "react";

import { ModuleSettingsProps } from "@framework/Module";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";

import { useAtom } from "jotai";

import { textAtom } from "./atoms";
import { SettingsToViewInterface, State } from "./state";

export const Settings = (props: ModuleSettingsProps<State, SettingsToViewInterface>) => {
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
};

Settings.displayName = "Settings";
