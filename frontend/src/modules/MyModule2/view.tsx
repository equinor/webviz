import { ModuleViewProps } from "@framework/Module";
import { Label } from "@lib/components/Label";

import { Interfaces } from "./interfaces";

export const View = (props: ModuleViewProps<Interfaces>) => {
    const text = props.viewContext.useSettingsToViewInterfaceValue("text");
    const derivedText = props.viewContext.useSettingsToViewInterfaceValue("derivedText");
    const persistentText = props.viewContext.useSettingsToViewInterfaceValue("persistentText");

    return (
        <div className="h-full w-full flex flex-col justify-center items-center">
            <Label text="Derived atom text">
                <>{derivedText}</>
            </Label>
            <Label text="State text">
                <>{text}</>
            </Label>

            <Label text="Persistent text">
                <>{persistentText}</>
            </Label>
        </div>
    );
};

View.displayName = "View";
