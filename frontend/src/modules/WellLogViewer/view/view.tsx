import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";

import { SubsurfaceLogViewerWrapper } from "./SubsurfaceLogViewerWrapper";

import { SettingsToViewInterface } from "../settingsToViewInterface";
import { State } from "../state";

export function View(props: ModuleViewProps<State, SettingsToViewInterface>) {
    const statusWriter = useViewStatusWriter(props.viewContext);
    const selectedWellboreHeader = props.viewContext.useSettingsToViewInterfaceValue("wellboreHeader");
    const selectedLogName = props.viewContext.useSettingsToViewInterfaceValue("selectedLog");
    const selectedCurveNames = props.viewContext.useSettingsToViewInterfaceValue("curveNames");

    return (
        <SubsurfaceLogViewerWrapper
            wellboreHeader={selectedWellboreHeader}
            wellLogName={selectedLogName}
            selectedCurves={selectedCurveNames}
            statusWriter={statusWriter}
        />

        // TODO: Add hover event handlers and so on
    );
}
