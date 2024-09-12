import React from "react";

import { WellboreLogCurveData_api } from "@api";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { ContentError } from "@modules/_shared/components/ContentMessage";
import {
    usePropagateAllApiErrorsToStatusWriter,
    usePropagateApiErrorToStatusWriter,
} from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import { CircularProgress } from "@mui/material";

import { useAtomValue } from "jotai";

import { SubsurfaceLogViewerWrapper } from "./SubsurfaceLogViewerWrapper";
import { intersectionReferenceSystemAtom } from "./atoms/derivedAtoms";
import { wellboreTrajectoryQueryAtom } from "./atoms/queryAtoms";
import { useCurveDataQueries } from "./queries/wellLogQueries";

import { InterfaceTypes } from "../interfaces";

export function View(props: ModuleViewProps<InterfaceTypes>) {
    const statusWriter = useViewStatusWriter(props.viewContext);

    // Passed setting atoms
    const selectedWellboreHeader = props.viewContext.useSettingsToViewInterfaceValue("wellboreHeader");
    const requiredDataCurves = props.viewContext.useSettingsToViewInterfaceValue("requiredDataCurves");
    const templateTracks = props.viewContext.useSettingsToViewInterfaceValue("templateTracks");
    const viewerHorizontal = props.viewContext.useSettingsToViewInterfaceValue("viewerHorizontal");
    const padDataWithEmptyRows = props.viewContext.useSettingsToViewInterfaceValue("padDataWithEmptyRows");

    const wellborePicks = props.viewContext.useSettingsToViewInterfaceValue("selectedWellborePicks");

    // Derived vals
    const wellboreUuid = selectedWellboreHeader?.wellboreUuid ?? "";

    // External Data
    const curveDataQueries = useCurveDataQueries(wellboreUuid, requiredDataCurves);
    const wellboreTrajectoryDataQuery = useAtomValue(wellboreTrajectoryQueryAtom);
    const intersectionReferenceSystem = useAtomValue(intersectionReferenceSystemAtom);

    // TODO: Have every single query propagete their errors?
    // forEach: usePropagateApiErrorToStatusWriter(query, statusWriter);
    usePropagateApiErrorToStatusWriter(wellboreTrajectoryDataQuery, statusWriter);
    usePropagateAllApiErrorsToStatusWriter(curveDataQueries, statusWriter);

    const mainElementsLoading = !curveDataQueries.every((q) => q.isFetched) || !wellboreTrajectoryDataQuery.isFetched;
    statusWriter.setLoading(mainElementsLoading);

    const mainElementsSuccess = curveDataQueries.every((q) => q.isSuccess) && wellboreTrajectoryDataQuery.isSuccess;

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
        const curveData = curveDataQueries.map(({ data }) => data as WellboreLogCurveData_api);
        if (!intersectionReferenceSystem) throw new Error("Unexpected null for reference system");

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
