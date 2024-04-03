import React from "react";

import { ModuleSettingsProps } from "@framework/Module";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";

import { useAtom } from "jotai";

import { textAtom } from "./atoms";
import { Interface, State } from "./state";

export const Settings = (props: ModuleSettingsProps<State, Interface>) => {
    const [atomText, setAtomText] = useAtom(textAtom);
    const [stateText, setStateText] = props.settingsContext.useSettingsToViewInterfaceState("text");

    function handleStateTextChange(event: React.ChangeEvent<HTMLInputElement>) {
        setStateText(event.target.value);
    }

    function handleAtomTextChange(event: React.ChangeEvent<HTMLInputElement>) {
        setAtomText(event.target.value);
    }

    return (
        <>
            <Label text="Atom text">
                <Input value={atomText} onChange={handleAtomTextChange} />
            </Label>
            <Label text="State text">
                <Input value={stateText} onChange={handleStateTextChange} />
            </Label>
        </>
    );
};

Settings.displayName = "Settings";
