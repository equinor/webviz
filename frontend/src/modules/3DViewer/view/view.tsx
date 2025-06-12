import type React from "react";

import type { ModuleViewProps } from "@framework/Module";

import type { Interfaces } from "../interfaces";

import { DataProvidersWrapper } from "./components/DataProvidersWrapper";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const preferredViewLayout = props.viewContext.useSettingsToViewInterfaceValue("preferredViewLayout");
    const layerManager = props.viewContext.useSettingsToViewInterfaceValue("layerManager");
    const fieldId = props.viewContext.useSettingsToViewInterfaceValue("fieldId");

    if (!layerManager) {
        return null;
    }

    if (!fieldId) {
        return null;
    }

    return (
        <DataProvidersWrapper
            fieldId={fieldId}
            layerManager={layerManager}
            preferredViewLayout={preferredViewLayout}
            viewContext={props.viewContext}
            workbenchSession={props.workbenchSession}
            workbenchSettings={props.workbenchSettings}
            workbenchServices={props.workbenchServices}
        />
    );
}
