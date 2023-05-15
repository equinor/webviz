import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useGridIntersection, useStatisticalGridIntersection } from "./queryHooks";
import state from "./state";


import PlotlyGridIntersection from "./plotlyGridIntersection";


//-----------------------------------------------------------------------------------------------------------
export function view({ moduleContext, workbenchServices }: ModuleFCProps<state>) {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const selectedEnsembles = useSubscribedValue("navigator.ensembles", workbenchServices);
    const gridName = moduleContext.useStoreValue("gridName");
    const parameterName = moduleContext.useStoreValue("parameterName");
    const realizations = moduleContext.useStoreValue("realizations");
    const useStatistics = moduleContext.useStoreValue("useStatistics");
    const selectedEnsemble = selectedEnsembles && selectedEnsembles.length > 0 ? selectedEnsembles[0] : { caseUuid: null, ensembleName: null };
    const gridIntersectionQuery = useGridIntersection(selectedEnsemble.caseUuid, selectedEnsemble.ensembleName, gridName, parameterName, realizations ? realizations[0] : "0", useStatistics);
    const statisticalGridIntersectionQuery = useStatisticalGridIntersection(selectedEnsemble.caseUuid, selectedEnsemble.ensembleName, gridName, parameterName, realizations, useStatistics);



    if (!gridIntersectionQuery.data && !statisticalGridIntersectionQuery.data) { return (<div>no grid geometry</div>) }

    let intersectionData: any = []
    if (!useStatistics && gridIntersectionQuery?.data) {
        intersectionData = gridIntersectionQuery.data
    }
    else if (useStatistics && statisticalGridIntersectionQuery?.data) {
        intersectionData = statisticalGridIntersectionQuery.data
    }
    else { return <div>no data</div> }
    console.log(intersectionData)
    return (
        <div className="relative w-full h-full flex flex-col" ref={wrapperDivRef}>
            <PlotlyGridIntersection data={intersectionData} width={wrapperDivSize.width}
                height={wrapperDivSize.height} />
            <div className="absolute bottom-5 right-5 italic text-pink-400">{moduleContext.getInstanceIdString()}</div>
        </div>
    );
}
