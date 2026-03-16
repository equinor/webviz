import React from "react";

import { useAtom, useSetAtom } from "jotai";

import type { ModuleViewProps } from "@framework/Module";

import type { Interfaces } from "../interfaces";

import { verticalScaleAtom, viewStateAtom } from "./atoms/baseAtoms";
import { VisualizationAssemblerWrapper } from "./components/VisualizationAssemblerWrapper";
import { useStableAtomGetter } from "@framework/utils/atomUtils";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const preferredViewLayout = props.viewContext.useSettingsToViewInterfaceValue("preferredViewLayout");
    const dataProviderManager = props.viewContext.useSettingsToViewInterfaceValue("dataProviderManager");
    const fieldId = props.viewContext.useSettingsToViewInterfaceValue("fieldId");

    const getVerticalScale = useStableAtomGetter(verticalScaleAtom);
    const setVerticalScale = useSetAtom(verticalScaleAtom);

    const getViewState = useStableAtomGetter(viewStateAtom);
    const setViewState = useSetAtom(viewStateAtom);

    if (!dataProviderManager) {
        return null;
    }

    if (!fieldId) {
        return null;
    }

    console.debug("View render with fieldId:", fieldId); // Debug log to trace renders and fieldId changes

    return (
        <VisualizationAssemblerWrapper
            moduleInstanceId={props.viewContext.getInstanceIdString()}
            fieldId={fieldId}
            dataProviderManager={dataProviderManager}
            preferredViewLayout={preferredViewLayout}
            viewContext={props.viewContext}
            hoverService={props.hoverService}
            workbenchSession={props.workbenchSession}
            workbenchSettings={props.workbenchSettings}
            workbenchServices={props.workbenchServices}
            getInitialVerticalScale={getVerticalScale}
            onVerticalScaleChange={setVerticalScale}
            onViewStateChange={setViewState}
            getInitialViewState={getViewState}
        />
    );
}
