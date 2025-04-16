import React from "react";

import type { ModuleViewProps } from "@framework/Module";
import { CircularProgress } from "@mui/material";

import { useAtomValue } from "jotai";

import { wellboreTrajectoryQueryAtom } from "./atoms/queryAtoms";
import { ProviderVisualizationWrapper } from "./components/ProviderVisualizationWrapper";

import type { InterfaceTypes } from "../interfaces";

export function View(props: ModuleViewProps<InterfaceTypes>) {
    const providerManager = props.viewContext.useSettingsToViewInterfaceValue("providerManager");
    const selectedWellboreHeader = props.viewContext.useSettingsToViewInterfaceValue("wellboreHeader");
    const viewerHorizontal = props.viewContext.useSettingsToViewInterfaceValue("viewerHorizontal");
    const padDataWithEmptyRows = props.viewContext.useSettingsToViewInterfaceValue("padDataWithEmptyRows");

    const wellboreTrajectoryDataQuery = useAtomValue(wellboreTrajectoryQueryAtom);

    React.useEffect(
        function setModuleName() {
            let title = "";

            if (selectedWellboreHeader?.uniqueWellboreIdentifier) {
                title = selectedWellboreHeader.uniqueWellboreIdentifier;
            } else {
                title = "Well log Viewer";
            }

            props.viewContext.setInstanceTitle(title);
        },
        [props.viewContext, selectedWellboreHeader?.uniqueWellboreIdentifier],
    );

    if (!providerManager || !wellboreTrajectoryDataQuery.data) {
        return (
            <div className="absolute w-full h-full z-10 bg-white opacity-50 flex items-center justify-center">
                <CircularProgress />
            </div>
        );
    }

    return (
        <ProviderVisualizationWrapper
            providerManager={providerManager}
            wellboreHeader={selectedWellboreHeader}
            trajectoryData={wellboreTrajectoryDataQuery.data}
            horizontal={viewerHorizontal}
            padDataWithEmptyRows={padDataWithEmptyRows}
            moduleProps={props}
        />
    );
}
