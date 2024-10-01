import React from "react";

import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { ContentError } from "@modules/_shared/components/ContentMessage";
import {
    usePropagateAllApiErrorsToStatusWriter,
    usePropagateApiErrorToStatusWriter,
} from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import { CircularProgress } from "@mui/material";

import { useAtomValue } from "jotai";

import { intersectionReferenceSystemAtom } from "./atoms/derivedAtoms";
import { wellboreTrajectoryQueryAtom } from "./atoms/queryAtoms";
import { SubsurfaceLogViewerWrapper } from "./components/SubsurfaceLogViewerWrapper";
import { BaseAgnosticSourceData, useGeologyCurveDataQueries, useLogCurveDataQueries } from "./queries/wellLogQueries";

import { InterfaceTypes } from "../interfaces";

export function View(props: ModuleViewProps<InterfaceTypes>) {
    const statusWriter = useViewStatusWriter(props.viewContext);

    // Passed setting atoms
    const selectedWellboreHeader = props.viewContext.useSettingsToViewInterfaceValue("wellboreHeader");
    const requiredLogCurves = props.viewContext.useSettingsToViewInterfaceValue("requiredWellLogCurves");
    const requiredGeologyCurves = props.viewContext.useSettingsToViewInterfaceValue("requiredGeologyCurves");

    const templateTracks = props.viewContext.useSettingsToViewInterfaceValue("templateTracks");
    const viewerHorizontal = props.viewContext.useSettingsToViewInterfaceValue("viewerHorizontal");
    const padDataWithEmptyRows = props.viewContext.useSettingsToViewInterfaceValue("padDataWithEmptyRows");

    const wellborePicks = props.viewContext.useSettingsToViewInterfaceValue("selectedWellborePicks");

    // Derived vals
    const wellboreUuid = selectedWellboreHeader?.wellboreUuid ?? "";

    // External Data
    const curveDataQueries = useLogCurveDataQueries(wellboreUuid, requiredLogCurves);
    const geologyDataQueries = useGeologyCurveDataQueries(wellboreUuid, requiredGeologyCurves);

    const allCurveDataQueries = [...curveDataQueries, ...geologyDataQueries];

    const wellboreTrajectoryDataQuery = useAtomValue(wellboreTrajectoryQueryAtom);
    const intersectionReferenceSystem = useAtomValue(intersectionReferenceSystemAtom);

    // TODO: Have every single query propagete their errors?
    // forEach: usePropagateApiErrorToStatusWriter(query, statusWriter);
    usePropagateApiErrorToStatusWriter(wellboreTrajectoryDataQuery, statusWriter);
    usePropagateAllApiErrorsToStatusWriter(allCurveDataQueries, statusWriter);

    const mainElementsLoading =
        !allCurveDataQueries.every((q) => q.isFetched) || !wellboreTrajectoryDataQuery.isFetched;
    statusWriter.setLoading(mainElementsLoading);

    const mainElementsSuccess = allCurveDataQueries.every((q) => q.isSuccess) && wellboreTrajectoryDataQuery.isSuccess;

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
        const curveData = allCurveDataQueries.map(({ data }) => data as BaseAgnosticSourceData);

        return (
            <SubsurfaceLogViewerWrapper
                wellboreHeader={selectedWellboreHeader}
                trajectoryData={wellboreTrajectoryDataQuery.data}
                intersectionReferenceSystem={intersectionReferenceSystem}
                wellpicks={wellborePicks}
                curveData={curveData}
                templateTracks={templateTracks}
                horizontal={viewerHorizontal}
                padDataWithEmptyRows={padDataWithEmptyRows}
                moduleProps={props}
            />
        );
    }
}
