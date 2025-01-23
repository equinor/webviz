import React from "react";

import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { ContentError } from "@modules/_shared/components/ContentMessage";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import { CircularProgress } from "@mui/material";

import { useAtomValue } from "jotai";

import { intersectionReferenceSystemAtom } from "./atoms/derivedAtoms";
import { logCurveDataQueryAtom, wellboreTrajectoryQueryAtom } from "./atoms/queryAtoms";
import { SubsurfaceLogViewerWrapper } from "./components/SubsurfaceLogViewerWrapper";

import { InterfaceTypes } from "../interfaces";

export function View(props: ModuleViewProps<InterfaceTypes>) {
    const statusWriter = useViewStatusWriter(props.viewContext);

    // Passed setting atoms
    const selectedWellboreHeader = props.viewContext.useSettingsToViewInterfaceValue("wellboreHeader");

    const templateTracks = props.viewContext.useSettingsToViewInterfaceValue("templateTracks");
    const viewerHorizontal = props.viewContext.useSettingsToViewInterfaceValue("viewerHorizontal");
    const padDataWithEmptyRows = props.viewContext.useSettingsToViewInterfaceValue("padDataWithEmptyRows");

    const wellborePicks = props.viewContext.useSettingsToViewInterfaceValue("selectedWellborePicks");

    const wellboreTrajectoryDataQuery = useAtomValue(wellboreTrajectoryQueryAtom);
    const intersectionReferenceSystem = useAtomValue(intersectionReferenceSystemAtom);
    const curveDataQueries = useAtomValue(logCurveDataQueryAtom);

    const mainElementsLoading = curveDataQueries.isLoading || wellboreTrajectoryDataQuery.isLoading;
    const mainElementsSuccess = curveDataQueries.isSuccess && wellboreTrajectoryDataQuery.isSuccess;

    statusWriter.setLoading(mainElementsLoading);

    usePropagateApiErrorToStatusWriter(wellboreTrajectoryDataQuery, statusWriter);
    usePropagateApiErrorToStatusWriter(curveDataQueries, statusWriter);

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
        [props.viewContext, selectedWellboreHeader?.uniqueWellboreIdentifier]
    );

    if (mainElementsLoading) {
        return (
            <div className="absolute w-full h-full z-10 bg-white opacity-50 flex items-center justify-center">
                <CircularProgress />
            </div>
        );
    } else if (!mainElementsSuccess) {
        return <ContentError>Error loading curve data.</ContentError>;
    } else if (!intersectionReferenceSystem) {
        return <ContentError>Unexpected null for reference system.</ContentError>;
    } else if (!wellboreTrajectoryDataQuery.data) {
        return <ContentError>Unexpected null for trajectory data</ContentError>;
    } else {
        return (
            <SubsurfaceLogViewerWrapper
                wellboreHeader={selectedWellboreHeader}
                trajectoryData={wellboreTrajectoryDataQuery.data}
                intersectionReferenceSystem={intersectionReferenceSystem}
                wellpicks={wellborePicks}
                curveData={curveDataQueries.data}
                templateTrackConfigs={templateTracks}
                horizontal={viewerHorizontal}
                padDataWithEmptyRows={padDataWithEmptyRows}
                moduleProps={props}
            />
        );
    }
}
