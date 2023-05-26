import React, { useEffect } from "react";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";
import { usePvtDataQuery } from "./queryHooks";
import state from "./state";

import { PvtQueryDataAccessor } from "./pvtQueryDataAccessor";
import { PvtPlotAccessor, PlotDataType } from "./pvtPlotDataAccessor";
import PlotlyPvtScatter from "./plotlyPvtScatter";
import { set } from "lodash";
//-----------------------------------------------------------------------------------------------------------


export function view({ moduleContext, workbenchServices }: ModuleFCProps<state>) {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    // From Workbench
    const workbenchEnsembles = useSubscribedValue("navigator.ensembles", workbenchServices);

    //Just using the first ensemble for now
    const selectedEnsemble = workbenchEnsembles?.[0] ?? { caseUuid: null, ensembleName: null };

    const activeDataSet = moduleContext.useStoreValue("activeDataSet");
    const activeRealization = moduleContext.useStoreValue("realization");

    const [plotData, setPlotData] = React.useState<PlotDataType[]>([])
    const pvtDataQuery = usePvtDataQuery(selectedEnsemble.caseUuid, selectedEnsemble.ensembleName, activeRealization);


    useEffect(() => {
        if (activeDataSet && pvtDataQuery.data) {
            const pvtQueryDataAccessor = new PvtQueryDataAccessor(pvtDataQuery.data)
            const PvtPlotData = []
            for (const pvtPlotData of activeDataSet) {
                const pvtData = pvtQueryDataAccessor.getPvtData(pvtPlotData.pvtName, pvtPlotData.pvtNum)
                const pvtPlotAccessor = new PvtPlotAccessor(pvtData)
                PvtPlotData.push(pvtPlotAccessor.getPlotData(pvtPlotData.pvtPlot))
            }
            setPlotData(PvtPlotData)
        }
    },
        [activeDataSet, pvtDataQuery.data]
    )
    if (!pvtDataQuery.data || !activeDataSet || activeDataSet.length == 0) { return (<div>no pvt data</div>) }




    return (
        <div className="flex flex-wrap h-full w-full" ref={wrapperDivRef}>
            {plotData.map((pvtPlotData, idx) => (
                <div className="w-1/2" key={idx}>
                    <PlotlyPvtScatter
                        data={pvtPlotData}
                        width={wrapperDivSize.width / 2}
                        height={wrapperDivSize.height / 2}
                    />
                </div>
            ))}
        </div>
    );
}

