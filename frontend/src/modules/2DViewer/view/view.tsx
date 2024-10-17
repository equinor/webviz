import React from "react";

import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";

import { LayersWrapper } from "./components/LayersWrapper";

import { Interfaces } from "../interfaces";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const preferredViewLayout = props.viewContext.useSettingsToViewInterfaceValue("preferredViewLayout");

    const statusWriter = useViewStatusWriter(props.viewContext);
    const layerManager = props.viewContext.useSettingsToViewInterfaceValue("layerManager");

    if (!layerManager) {
        return null;
    }

    return (
        <LayersWrapper
            layerManager={layerManager}
            preferredViewLayout={preferredViewLayout}
            statusWriter={statusWriter}
        />
    );
}
