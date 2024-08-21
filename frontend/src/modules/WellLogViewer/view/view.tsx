import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import { CircularProgress } from "@mui/material";

import { useAtomValue } from "jotai";

import { SubsurfaceLogViewerWrapper } from "./SubsurfaceLogViewerWrapper";
import { intersectionReferenceSystemAtom } from "./atoms/derivedAtoms";
import { wellboreTrajectoryQueryAtom } from "./atoms/queryAtoms";
import { sanitizeCurveDataQueriesResult, useCurveDataQueries } from "./queries/wellLogQueries";

import { SettingsToViewInterface } from "../settingsToViewInterface";
import { State } from "../state";

export function View(props: ModuleViewProps<State, SettingsToViewInterface>) {
    const statusWriter = useViewStatusWriter(props.viewContext);

    // Passed setting atoms
    const selectedWellboreHeader = props.viewContext.useSettingsToViewInterfaceValue("wellboreHeader");
    const requiredDataCurves = props.viewContext.useSettingsToViewInterfaceValue("requiredDataCurves");
    const templateTrackConfigs = props.viewContext.useSettingsToViewInterfaceValue("templateTrackConfigs");
    const viewerHorizontal = props.viewContext.useSettingsToViewInterfaceValue("viewerHorizontal");

    // Derived vals
    const wellboreUuid = selectedWellboreHeader?.wellboreUuid ?? "";

    // External Data
    const curveDataQueries = useCurveDataQueries(wellboreUuid, requiredDataCurves);
    const wellboreTrajectoryDataQuery = useAtomValue(wellboreTrajectoryQueryAtom);
    const intersectionReferenceSystem = useAtomValue(intersectionReferenceSystemAtom);

    // TODO: Have every single query propagete their errors?
    // forEach: usePropagateApiErrorToStatusWriter(query, statusWriter);
    usePropagateApiErrorToStatusWriter(wellboreTrajectoryDataQuery, statusWriter);

    const mainElementsLoading = !curveDataQueries.every((q) => q.isSuccess) || !wellboreTrajectoryDataQuery.isSuccess;

    statusWriter.setLoading(mainElementsLoading);

    if (mainElementsLoading) {
        return (
            <div className="absolute w-full h-full z-10 bg-white opacity-50 flex items-center justify-center">
                <CircularProgress />
            </div>
        );
    } else {
        const curveData = sanitizeCurveDataQueriesResult(curveDataQueries, requiredDataCurves);
        if (!intersectionReferenceSystem) throw new Error("Unexpected null for reference system");

        return (
            <SubsurfaceLogViewerWrapper
                wellboreHeader={selectedWellboreHeader}
                trajectoryData={wellboreTrajectoryDataQuery.data}
                intersectionReferenceSystem={intersectionReferenceSystem}
                curveData={curveData}
                templateTrackConfigs={templateTrackConfigs}
                horizontal={viewerHorizontal}
                moduleProps={props}
            />
        );
    }
}
