import type React from "react";

import type { ModuleViewProps } from "@framework/Module";

import type { Interfaces } from "../interfaces";

import { DataProvidersWrapper } from "./components/VisualizationAssemblerWrapper";
import { useAtom } from "jotai";
import { verticalScaleAtom, viewStateAtom } from "./atoms/baseAtoms";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const preferredViewLayout = props.viewContext.useSettingsToViewInterfaceValue("preferredViewLayout");
    const dataProviderManager = props.viewContext.useSettingsToViewInterfaceValue("dataProviderManager");
    const fieldId = props.viewContext.useSettingsToViewInterfaceValue("fieldId");

    const [verticalScale, setVerticalScale] = useAtom(verticalScaleAtom);
    const [viewState, setViewState] = useAtom(viewStateAtom);

    if (!dataProviderManager) {
        return null;
    }

    if (!fieldId) {
        return null;
    }

    return (
        <DataProvidersWrapper
            moduleInstanceId={props.viewContext.getInstanceIdString()}
            fieldId={fieldId}
            dataProviderManager={dataProviderManager}
            preferredViewLayout={preferredViewLayout}
            viewContext={props.viewContext}
            hoverService={props.hoverService}
            workbenchSession={props.workbenchSession}
            workbenchSettings={props.workbenchSettings}
            workbenchServices={props.workbenchServices}
            initialVerticalScale={verticalScale}
            onVerticalScaleChange={setVerticalScale}
            onViewStateChange={setViewState}
            viewState={viewState ?? undefined}
        />
    );
}
