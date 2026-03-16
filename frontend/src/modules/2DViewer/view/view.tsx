import type React from "react";

import { useAtom, useSetAtom } from "jotai";

import type { ModuleViewProps } from "@framework/Module";

import type { Interfaces } from "../interfaces";

import { viewStateAtom } from "./atoms/baseAtoms";
import { VisualizationAssemblerWrapper } from "./components/VisualizationAssemblerWrapper";
import { useStableAtomGetter } from "@framework/utils/atomUtils";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const preferredViewLayout = props.viewContext.useSettingsToViewInterfaceValue("preferredViewLayout");
    const dataProviderManager = props.viewContext.useSettingsToViewInterfaceValue("dataProviderManager");
    const fieldId = props.viewContext.useSettingsToViewInterfaceValue("fieldId");

    const getViewState = useStableAtomGetter(viewStateAtom);
    const setViewState = useSetAtom(viewStateAtom);

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
            hoverService={props.hoverService}
            onViewStateChange={setViewState}
            getInitialViewState={getViewState}
            workbenchSession={props.workbenchSession}
            workbenchSettings={props.workbenchSettings}
            workbenchServices={props.workbenchServices}
        />
    );
}
