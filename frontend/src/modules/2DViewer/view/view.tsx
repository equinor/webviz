import type React from "react";

import { useAtom } from "jotai";

import type { ModuleViewProps } from "@framework/Module";

import type { Interfaces } from "../interfaces";

import { viewStateAtom } from "./atoms/baseAtoms";
import { VisualizationAssemblerWrapper } from "./components/VisualizationAssemblerWrapper";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const preferredViewLayout = props.viewContext.useSettingsToViewInterfaceValue("preferredViewLayout");
    const dataProviderManager = props.viewContext.useSettingsToViewInterfaceValue("dataProviderManager");
    const fieldId = props.viewContext.useSettingsToViewInterfaceValue("fieldId");
    const [viewState, setViewState] = useAtom(viewStateAtom);

    if (!dataProviderManager) {
        return null;
    }

    if (!fieldId) {
        return null;
    }

    return (
        <VisualizationAssemblerWrapper
            fieldId={fieldId}
            viewContext={props.viewContext}
            preferredViewLayout={preferredViewLayout}
            dataProviderManager={dataProviderManager}
            onViewStateChange={setViewState}
            viewState={viewState ?? undefined}
            workbenchSession={props.workbenchSession}
            workbenchSettings={props.workbenchSettings}
            workbenchServices={props.workbenchServices}
        />
    );
}
