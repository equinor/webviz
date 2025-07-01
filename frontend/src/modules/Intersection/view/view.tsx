import type React from "react";

import type { ModuleViewProps } from "@framework/Module";

import type { Interfaces } from "../interfaces";

import { DataProvidersWrapper } from "./components/DataProvidersWrapper";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const preferredViewLayout = props.viewContext.useSettingsToViewInterfaceValue("preferredViewLayout");
    const dataProviderManager = props.viewContext.useSettingsToViewInterfaceValue("dataProviderManager");

    if (!dataProviderManager) {
        return null;
    }

    return (
        <DataProvidersWrapper
            dataProviderManager={dataProviderManager}
            preferredViewLayout={preferredViewLayout}
            viewContext={props.viewContext}
            workbenchSession={props.workbenchSession}
            workbenchSettings={props.workbenchSettings}
            workbenchServices={props.workbenchServices}
            hoverService={props.hoverService}
        />
    );
}
