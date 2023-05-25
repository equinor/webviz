import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";

import state from "./state";
import PlotlyPvtScatter from "./plotlyPvtScatter";
//-----------------------------------------------------------------------------------------------------------


export function view({ moduleContext }: ModuleFCProps<state>) {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const pvtPlotDataSet = moduleContext.useStoreValue("pvtPlotDataSet");

    if (!pvtPlotDataSet || pvtPlotDataSet.length == 0) { return (<div>no pvt data</div>) }

    return (
        <div className="flex flex-wrap h-full w-full" ref={wrapperDivRef}>
            {pvtPlotDataSet.map((pvtPlotData, idx) => (
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
