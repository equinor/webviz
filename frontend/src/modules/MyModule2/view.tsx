import React from "react";

import { ModuleViewProps } from "@framework/Module";
import { Label } from "@lib/components/Label";

import { SettingsToViewInterface } from "./settingsToViewInterface";

export const View = (props: ModuleViewProps<SettingsToViewInterface>) => {
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
