import React from "react";

import { ModuleViewProps } from "@framework/Module";
import { useFirstEnsembleInEnsembleSet } from "@framework/WorkbenchSession";
import { useElementSize } from "@lib/hooks/useElementSize";

import PlotlyGridIntersection from "./plotlyGridIntersection";
import { useGridIntersection, useStatisticalGridIntersection } from "./queryHooks";
import state from "./state";

//-----------------------------------------------------------------------------------------------------------
export function View({ viewContext, workbenchSession }: ModuleViewProps<state>) {
    // Viewport size
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    // From Workbench
    const firstEnsemble = useFirstEnsembleInEnsembleSet(workbenchSession);

    // State
    const gridName = viewContext.useStoreValue("gridName");
    const parameterName = viewContext.useStoreValue("parameterName");
    const realizations = viewContext.useStoreValue("realizations");
    const useStatistics = viewContext.useStoreValue("useStatistics");

    // Queries
    const firstCaseUuid = firstEnsemble?.getCaseUuid() ?? null;
    const firstEnsembleName = firstEnsemble?.getEnsembleName() ?? null;
    const gridIntersectionQuery = useGridIntersection(
        firstCaseUuid,
        firstEnsembleName,
        gridName,
        parameterName,
        realizations ? realizations[0] : "0",
        useStatistics
    );
    const statisticalGridIntersectionQuery = useStatisticalGridIntersection(
        firstCaseUuid,
        firstEnsembleName,
        gridName,
        parameterName,
        realizations,
        useStatistics
    );

    if (!gridIntersectionQuery.data && !statisticalGridIntersectionQuery.data) {
        return <div>no grid geometry</div>;
    }

    let intersectionData: any = [];
    if (!useStatistics && gridIntersectionQuery?.data) {
        intersectionData = gridIntersectionQuery.data;
    } else if (useStatistics && statisticalGridIntersectionQuery?.data) {
        intersectionData = statisticalGridIntersectionQuery.data;
    } else {
        return <div>Fetching data...</div>;
    }
    return (
        <div className="relative w-full h-full flex flex-col" ref={wrapperDivRef}>
            <PlotlyGridIntersection
                data={intersectionData}
                width={wrapperDivSize.width}
                height={wrapperDivSize.height}
            />
            <div className="absolute bottom-5 right-5 italic text-pink-400">{viewContext.getInstanceIdString()}</div>
        </div>
    );
}
