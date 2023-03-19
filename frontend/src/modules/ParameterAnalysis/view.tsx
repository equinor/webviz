import React from "react";
import Plot from "react-plotly.js";

import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useElementSize } from "@lib/hooks/useElementSize";
import { Layout, PlotHoverEvent, PlotData, PlotMouseEvent, PlotRelayoutEvent } from "plotly.js";
import { State } from "./registerModule";
import { UseQueryResult } from "@tanstack/react-query";
import { EnsembleParameter } from "@api";
import { useParameterQuery } from "./queryHooks";
interface MyPlotData extends Partial<PlotData> {
    realizationNumber?: number | null;

    // Did they forget to expose this one
    legendrank?: number;
}


function createPlotlyTimeseriesRealizationTraces(
    parameterQuery: UseQueryResult<EnsembleParameter>,
    subscribedPlotlyRealization: { realization: number } | null): MyPlotData[] {
    const tracesDataArr: MyPlotData[] = [];
    let parameter: EnsembleParameter | null = null

    if (parameterQuery.data && parameterQuery.data.values.length > 0) {
        const values = parameterQuery.data.values as number[];
        const realizations = parameterQuery.data.realizations as number[];
        const x: number[] = [];
        const y: number[] = [];
        const color: string[] = [];

        for (let i = 0; i < values.length; i++) {
            const curveColor = realizations[i] === subscribedPlotlyRealization?.realization ? "red" : "green";
            x.push(realizations[i]);
            y.push(values[i]);
            color.push(curveColor);
        }
        const trace: Partial<PlotData> = {
            x: x,
            y: y,
            type: "bar",
            marker: {
                color: color,
            },
        };
        tracesDataArr.push(trace);
    }

    return tracesDataArr;
}

export const view = ({ moduleContext, workbenchServices }: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const caseUuid = useSubscribedValue("navigator.caseId", workbenchServices);
    const ensembleName = moduleContext.useStoreValue("ensembleName");
    const [parameterName] = moduleContext.useStoreState("parameterName");
    const parameterQuery = useParameterQuery(
        caseUuid,
        ensembleName,
        parameterName
    );
    const subscribedPlotlyRealization = useSubscribedValue("global.hoverRealization", workbenchServices);

    const handleHover = (e: PlotHoverEvent) => {
        const realization = e.points[0].x;
        if (typeof realization === "number") {
            workbenchServices.publishGlobalData("global.hoverRealization", {
                realization: realization,
            });
        }
    };

    function handleUnHover() {
        workbenchServices.publishGlobalData("global.hoverRealization", { realization: -1 });
    }


    const tracesDataArr = createPlotlyTimeseriesRealizationTraces(parameterQuery, subscribedPlotlyRealization);
    const layout: Partial<Layout> = {
        width: wrapperDivSize.width, height: wrapperDivSize.height, title: parameterName, xaxis: { title: "Realization" },
    };

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <Plot data={tracesDataArr} layout={layout} config={{ "scrollZoom": true }} onHover={handleHover} onUnhover={handleUnHover} />
        </div>
    );
};
