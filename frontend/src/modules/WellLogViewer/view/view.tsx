import React from "react";

import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { ContentError } from "@modules/_shared/components/ContentMessage";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import { CircularProgress } from "@mui/material";
import { UseQueryResult } from "@tanstack/react-query";

import { useAtomValue } from "jotai";

import { intersectionReferenceSystemAtom } from "./atoms/derivedAtoms";
import { wellboreTrajectoryQueryAtom } from "./atoms/queryAtoms";
import { SubsurfaceLogViewerWrapper } from "./components/SubsurfaceLogViewerWrapper";
import { useLogCurveDataQueries } from "./queries/wellLogQueries";

import { InterfaceTypes } from "../interfaces";

export function View(props: ModuleViewProps<InterfaceTypes>) {
    const statusWriter = useViewStatusWriter(props.viewContext);

    // Passed setting atoms
    const selectedWellboreHeader = props.viewContext.useSettingsToViewInterfaceValue("wellboreHeader");

    const requiredCurves = props.viewContext.useSettingsToViewInterfaceValue("requiredCurves");

    const templateTracks = props.viewContext.useSettingsToViewInterfaceValue("templateTracks");
    const viewerHorizontal = props.viewContext.useSettingsToViewInterfaceValue("viewerHorizontal");
    const padDataWithEmptyRows = props.viewContext.useSettingsToViewInterfaceValue("padDataWithEmptyRows");

    const wellborePicks = props.viewContext.useSettingsToViewInterfaceValue("selectedWellborePicks");

    // Derived vals
    const wellboreUuid = selectedWellboreHeader?.wellboreUuid ?? "";

    const wellboreTrajectoryDataQuery = useAtomValue(wellboreTrajectoryQueryAtom);
    const intersectionReferenceSystem = useAtomValue(intersectionReferenceSystemAtom);
    const allCurveDataQueries = useLogCurveDataQueries(wellboreUuid, requiredCurves);

    const mainElementsLoading = allCurveDataQueries.isLoading || wellboreTrajectoryDataQuery.isLoading;
    const mainElementsSuccess = allCurveDataQueries.isSuccess && wellboreTrajectoryDataQuery.isSuccess;

    statusWriter.setLoading(mainElementsLoading);

    usePropagateApiErrorToStatusWriter(wellboreTrajectoryDataQuery, statusWriter);
    usePropagateApiErrorToStatusWriter(allCurveDataQueries as UseQueryResult, statusWriter);

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
    } else {
        if (!intersectionReferenceSystem) throw new Error("Unexpected null for reference system");
        const curveData = allCurveDataQueries.data ?? [];

        return (
            <SubsurfaceLogViewerWrapper
                wellboreHeader={selectedWellboreHeader}
                trajectoryData={wellboreTrajectoryDataQuery.data}
                intersectionReferenceSystem={intersectionReferenceSystem}
                wellpicks={wellborePicks}
                curveData={curveData}
                templateTrackConfigs={templateTracks}
                horizontal={viewerHorizontal}
                padDataWithEmptyRows={padDataWithEmptyRows}
                moduleProps={props}
            />
        );
    }
}
