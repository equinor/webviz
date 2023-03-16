import React from "react";
import Plot from "react-plotly.js";

import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue, GlobalTopicDefinitions } from "@framework/WorkbenchServices";
import { useElementSize } from "@lib/hooks/useElementSize";
import { Layout, PlotHoverEvent, PlotData, PlotMouseEvent, PlotRelayoutEvent } from "plotly.js";
import { useStatisticalVectorDataQuery, useVectorDataQuery, useParameterQuery } from "./queryHooks";
import { State } from "./state";
import { UseQueryResult } from "@tanstack/react-query";
import { VectorRealizationData, EnsembleParameter } from "@api";
import { find_intermediate_color } from "./utils";

interface MyPlotData extends Partial<PlotData> {
    realizationNumber?: number | null;

    // Did they forget to expose this one
    legendrank?: number;
}
function normalizeParameter(parameter: EnsembleParameter) {
    const values: number[] = parameter.values as number[]
    // find the max value
    let normMax = 1;
    let m = 0;
    for (let x = 0; x < values.length; x++) m = Math.max(m, values[x]);
    // find the ratio
    let r = normMax / m;
    // normalize the array
    for (let x = 0; x < values.length; x++) values[x] = values[x] * r;
    parameter.values = values
    return parameter
}
function set_real_color(parameter: EnsembleParameter, real_no: number): string {
    /*
    Return color for trace based on normalized parameter value.
    Midpoint for the colorscale is set on the average value
    */
    const values = parameter.values as number[];
    const realizations = parameter.realizations as number[];
    const blue = "rgba(39, 67, 245, 0.8)";
    const mid_color = "rgba(220,220,220,1)";
    const green = "rgba(62,208,62, 1)";
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const norm_value = values[realizations.indexOf(real_no)];
    if (norm_value <= mean) {
        const intermed = norm_value / mean;
        return find_intermediate_color(blue, mid_color, intermed, "rgba");
    }
    if (norm_value > mean) {
        const intermed = (norm_value - mean) / (1 - mean);
        return find_intermediate_color(mid_color, green, intermed, "rgba");
    }
    return "rgba(220,220,220, 0.8)";
}

function createPlotlyTimeseriesRealizationTraces(
    vectorQuery: UseQueryResult<VectorRealizationData[]>,
    parameterQuery: UseQueryResult<EnsembleParameter>,
    showParameter: boolean,
    subscribedPlotlyRealization: { realization: number } | null): MyPlotData[] {
    const tracesDataArr: MyPlotData[] = [];
    let parameter: EnsembleParameter | null = null
    if (showParameter && parameterQuery.data) {
        parameter = normalizeParameter(parameterQuery.data)

    }
    if (vectorQuery.data && vectorQuery.data.length > 0) {
        let highlightedTrace: MyPlotData | null = null;
        for (let i = 0; i < vectorQuery.data.length; i++) {
            const vec = vectorQuery.data[i];
            let curveColor: string
            if (vec.realization === subscribedPlotlyRealization?.realization) {
                curveColor = "red"
            }
            else if (parameter && showParameter) {
                curveColor = set_real_color(parameter, vec.realization as number)
            }
            else { curveColor = "green" }

            const isHighlighted = vec.realization === subscribedPlotlyRealization?.realization ? true : false;
            const lineWidth = vec.realization === subscribedPlotlyRealization?.realization ? 3 : 1;
            const trace: MyPlotData = {
                x: vec.timestamps,
                y: vec.values,
                name: `real-${vec.realization}`,
                realizationNumber: vec.realization,
                legendrank: vec.realization,
                type: "scatter",
                mode: "lines",
                line: { color: curveColor, width: lineWidth },
            };

            if (isHighlighted) {
                highlightedTrace = trace;
            } else {
                tracesDataArr.push(trace);
            }
        }

        if (highlightedTrace) {
            tracesDataArr.push(highlightedTrace);
        }
    }


    return tracesDataArr;
}

export const view = ({ moduleContext, workbenchServices }: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const caseUuid = useSubscribedValue("navigator.caseId", workbenchServices);
    const ensembleName = moduleContext.useStoreValue("ensembleName");
    const vectorName = moduleContext.useStoreValue("vectorName");
    const resampleFrequency = moduleContext.useStoreValue("resamplingFrequency");
    const showStatistics = moduleContext.useStoreValue("showStatistics");
    const realizationsToInclude = moduleContext.useStoreValue("realizationsToInclude");
    const [showParameter] = moduleContext.useStoreState("showParameter");
    const [parameterName] = moduleContext.useStoreState("parameterName");
    const vectorQuery = useVectorDataQuery(
        caseUuid,
        ensembleName,
        vectorName,
        resampleFrequency,
        realizationsToInclude
    );

    const statisticsQuery = useStatisticalVectorDataQuery(
        caseUuid,
        ensembleName,
        vectorName,
        resampleFrequency,
        realizationsToInclude,
        showStatistics
    );
    const parameterQuery = useParameterQuery(
        caseUuid,
        ensembleName,
        parameterName
    );
    // React.useEffect(
    //     function subscribeToHoverRealizationTopic() {
    //         const unsubscribeFunc = workbenchServices.subscribe("global.hoverRealization", ({ realization }) => {
    //             setHighlightRealization(realization);
    //         });
    //         return unsubscribeFunc;
    //     },
    //     [workbenchServices]
    // );

    const subscribedPlotlyTimeStamp = useSubscribedValue("global.hoverTimestamp", workbenchServices);
    const subscribedPlotlyRealization = useSubscribedValue("global.hoverRealization", workbenchServices);
    // const highlightedTrace
    const handleHover = (e: PlotHoverEvent) => {
        if (e.xvals.length > 0 && typeof e.xvals[0]) {
            workbenchServices.publishGlobalData("global.hoverTimestamp", { timestamp: e.xvals[0] as number });
        }
        const curveData = e.points[0].data as MyPlotData;
        if (typeof curveData.realizationNumber === "number") {
            // setHighlightRealization(curveData.realizationNumber);

            workbenchServices.publishGlobalData("global.hoverRealization", {
                realization: curveData.realizationNumber,
            });
        }
    }

    function handleUnHover(e: PlotMouseEvent) {
        workbenchServices.publishGlobalData("global.hoverRealization", { realization: -1 });
    }


    const tracesDataArr = createPlotlyTimeseriesRealizationTraces(vectorQuery, parameterQuery, showParameter, subscribedPlotlyRealization);

    if (showStatistics && statisticsQuery.data) {
        for (const statValueObj of statisticsQuery.data.value_objects) {
            const trace: MyPlotData = {
                x: statisticsQuery.data.timestamps,
                y: statValueObj.values,
                name: statValueObj.statistic_function,
                legendrank: -1,
                type: "scatter",
                mode: "lines",
                line: { color: "lightblue", width: 2, dash: "dot" },
            };
            tracesDataArr.push(trace);
        }
    }
    const layout: Partial<Layout> = { width: wrapperDivSize.width, height: wrapperDivSize.height, title: "Simulation Time Series" };
    if (subscribedPlotlyTimeStamp) {
        layout["shapes"] = [
            {
                type: "line",
                xref: "x",
                yref: "paper",
                x0: new Date(subscribedPlotlyTimeStamp.timestamp),
                y0: 0,
                x1: new Date(subscribedPlotlyTimeStamp.timestamp),
                y1: 1,
                line: {
                    color: "#ccc",
                    width: 1,
                },
            },
        ];
    }

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <Plot data={tracesDataArr} layout={layout} config={{ "scrollZoom": true }} onHover={handleHover} onUnhover={handleUnHover} />
        </div>
    );
};
