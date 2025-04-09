import React from "react";

import type { ModuleViewProps } from "@framework/Module";
// import { useViewStatusWriter } from "@framework/StatusWriter";
import { CircularProgress } from "@mui/material";

import { useAtomValue } from "jotai";

import { intersectionReferenceSystemAtom } from "./atoms/derivedAtoms";
import { wellboreTrajectoryQueryAtom } from "./atoms/queryAtoms";
import { SubsurfaceLogViewerWrapper } from "./components/SubsurfaceLogViewerWrapper";

import type { InterfaceTypes } from "../interfaces";

export function View(props: ModuleViewProps<InterfaceTypes>) {
    // const statusWriter = useViewStatusWriter(props.viewContext);

    const providerManager = props.viewContext.useSettingsToViewInterfaceValue("providerManager");

    // Passed setting atoms
    const selectedWellboreHeader = props.viewContext.useSettingsToViewInterfaceValue("wellboreHeader");
    const viewerHorizontal = props.viewContext.useSettingsToViewInterfaceValue("viewerHorizontal");
    const padDataWithEmptyRows = props.viewContext.useSettingsToViewInterfaceValue("padDataWithEmptyRows");

    const wellboreTrajectoryDataQuery = useAtomValue(wellboreTrajectoryQueryAtom);
    const intersectionReferenceSystem = useAtomValue(intersectionReferenceSystemAtom);

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

    if (!providerManager || !wellboreTrajectoryDataQuery.data || !intersectionReferenceSystem) {
        return (
            <div className="absolute w-full h-full z-10 bg-white opacity-50 flex items-center justify-center">
                <CircularProgress />
            </div>
        );
    }

    return (
        <SubsurfaceLogViewerWrapper
            moduleProps={props}
            providerManager={providerManager}
            wellboreHeader={selectedWellboreHeader}
            trajectoryData={wellboreTrajectoryDataQuery.data}
            intersectionReferenceSystem={intersectionReferenceSystem}
            horizontal={viewerHorizontal}
            padDataWithEmptyRows={padDataWithEmptyRows}
        />
    );
}
