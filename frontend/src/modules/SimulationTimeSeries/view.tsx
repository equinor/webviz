import React from "react";
import Plot from "react-plotly.js";

import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useSize } from "@lib/hooks/useSize";

import {  Layout, PlotHoverEvent,PlotData, PlotMouseEvent, PlotRelayoutEvent} from "plotly.js";
import { useStatisticalVectorDataQuery, useVectorDataQuery } from "./plotlyQueryHooks";
import { State } from "./state";

interface MyPlotData extends Partial<PlotData> {
    realizationNumber?: number | null;

    // Did they forget to expose this one
    legendrank?: number;
}
export const view = ({ moduleContext, workbenchServices }: ModuleFCProps<State>) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const size = useSize(ref);
    const caseUuid = useSubscribedValue("navigator.caseId", workbenchServices);
    const ensembleName = moduleContext.useStoreValue("ensembleName");
    const vectorName = moduleContext.useStoreValue("vectorName");
    const resampleFrequency = moduleContext.useStoreValue("resamplingFrequency");
    const showStatistics = moduleContext.useStoreValue("showStatistics");
    const realizationsToInclude = moduleContext.useStoreValue("realizationsToInclude");
    const [highlightRealization, setHighlightRealization] = React.useState(-1);

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

    // React.useEffect(
    //     function subscribeToHoverRealizationTopic() {
    //         const unsubscribeFunc = workbenchServices.subscribe("global.hoverRealization", ({ realization }) => {
    //             setHighlightRealization(realization);
    //         });
    //         return unsubscribeFunc;
    //     },
    //     [workbenchServices]
    // );

    const subscribedPlotlyTimeStamp = useSubscribedValue("global.timestamp", workbenchServices);
    const subscribedPlotlyRealization = useSubscribedValue("global.realization", workbenchServices);
    // const highlightedTrace
    const handleHover = (e: PlotHoverEvent) => {
        if (e.xvals.length > 0 && typeof e.xvals[0]) {
            workbenchServices.publishGlobalData("global.timestamp", { timestamp: e.xvals[0] as number });
        }
        const curveData = e.points[0].data as MyPlotData;
        if (typeof curveData.realizationNumber === "number") {
            // setHighlightRealization(curveData.realizationNumber);

            workbenchServices.publishGlobalData("global.realization", {
                realization: curveData.realizationNumber,
            });
        }
    }
    
    function handleUnHover(e: PlotMouseEvent) {
        workbenchServices.publishGlobalData("global.realization", {realization: -1});
    }


    const tracesDataArr: MyPlotData[] = [];

    if (vectorQuery.data && vectorQuery.data.length > 0) {
        let highlightedTrace: MyPlotData | null = null;
        for (let i = 0; i < Math.min(vectorQuery.data.length, 10); i++) {
            const vec = vectorQuery.data[i];
            const isHighlighted = vec.realization === subscribedPlotlyRealization?.realization ? true : false;
            const curveColor = vec.realization === subscribedPlotlyRealization?.realization ? "red" : "green";
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
    const layout: Partial<Layout> = { width: size.width, height: size.height, title: "Simulation Time Series" };
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
        <div className="w-full h-full" ref={ref}>
            <Plot data={tracesDataArr} layout={layout} config={{"scrollZoom":true}} onHover={handleHover} onUnhover={handleUnHover} />
        </div>
    );
};
