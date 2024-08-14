import { ViewStatusWriter } from "@framework/StatusWriter";
import { useWellboreTrajectoriesQuery } from "@modules/_shared/WellBore";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import { WellLogViewer } from "@webviz/well-log-viewer";

import { WellboreHeader } from "src/api/models/WellboreHeader";

import { sanitizeCurveDataQueriesResult, useCurveDataQueries } from "./queries/wellLogQueries";

import { COLOR_TABLES } from "../utils/logViewerColors";
import { createLogTemplate } from "../utils/logViewerTemplate";
import { createWellLog } from "../utils/queryDataTransform";

const AXIS_MNEMOS = {
    md: ["DEPTH", "DEPT", "MD", "TDEP", "MD_RKB"],
    tvd: ["TVD", "TVDSS", "DVER", "TVD_MSL"],
    time: ["TIME"],
};

export type SubsurfaceLogViewerWrapperProps = {
    wellboreHeader: WellboreHeader | null;
    wellLogName: string | null;
    selectedCurves: string[];

    statusWriter: ViewStatusWriter;
};

export function SubsurfaceLogViewerWrapper(props: SubsurfaceLogViewerWrapperProps) {
    const wellboreUuid = props.wellboreHeader?.wellboreUuid ?? "";
    const wellLogName = props.wellLogName ?? "";
    const selectedCurves = props.selectedCurves;
    const statusWriter = props.statusWriter;

    const wellboreTrajectoryData = useWellboreTrajectoriesQuery(wellboreUuid ? [wellboreUuid] : []);
    usePropagateApiErrorToStatusWriter(wellboreTrajectoryData, statusWriter);

    const curveDataQueries = useCurveDataQueries(wellboreUuid, props.selectedCurves);
    // TODO: Have every single query propagete their errors?
    // forEach: usePropagateApiErrorToStatusWriter(query, statusWriter);

    const dataReady = curveDataQueries.every((q) => q.isSuccess) && wellboreTrajectoryData.isSuccess;

    // TODO: Whenever I change the curves, the loader keeps spinning untill I trigger an ipdate
    statusWriter.setLoading(!dataReady);

    if (!dataReady) {
        return <span>Loading...</span>;
    }

    const curveData = sanitizeCurveDataQueriesResult(curveDataQueries, selectedCurves);
    const welllog = createWellLog(wellLogName, curveData, wellboreTrajectoryData.data[0]);
    const template = createLogTemplate(props.selectedCurves);

    return (
        <WellLogViewer
            id="asasdads"
            welllog={welllog}
            template={template}
            axisMnemos={AXIS_MNEMOS}
            colorTables={COLOR_TABLES}
            axisTitles={{
                md: "DEPTH",
                tvd: "TVD",
                time: "TIME",
            }}
            layout={{ right: undefined }}
        />
    );
    // TODO: Disable right panel, and make it a floating box on hover, to match intersection
    // layout={{ right: undefined }}
}
