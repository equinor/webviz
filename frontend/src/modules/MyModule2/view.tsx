import React from "react";

import { ModuleViewProps } from "@framework/Module";
import { Label } from "@lib/components/Label";

import { Interface, State } from "./state";

export const View = (props: ModuleViewProps<State, Interface>) => {
    const text = props.viewContext.useSettingsToViewInterfaceValue("text");
    const derivedText = props.viewContext.useSettingsToViewInterfaceValue("derivedText");

    return (
        <div className="h-full w-full flex flex-col justify-center items-center">
            <Label text="Derived atom text">
                <>{derivedText}</>
            </Label>
            <Label text="State text">
                <>{text}</>
            </Label>
        </div>
    );
};

View.displayName = "View";
