import React from "react";

import { VectorHistoricalData_api, VectorRealizationData_api, VectorStatisticData_api } from "@api";
import { BroadcastChannelMeta } from "@framework/Broadcaster";
import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { Plot } from "@lib/components/Plot";
import { useElementSize } from "@lib/hooks/useElementSize";

import { Layout, PlotData, PlotHoverEvent } from "plotly.js";

import { BroadcastChannelNames } from "./channelDefs";
import { useHistoricalVectorDataQuery, useStatisticalVectorDataQuery, useVectorDataQuery } from "./queryHooks";
import { State } from "./state";

interface MyPlotData extends Partial<PlotData> {
    realizationNumber?: number | null;

    // Did they forget to expose this one
    legendrank?: number;
}

export const view = ({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const vectorSpec = moduleContext.useStoreValue("vectorSpec");
    const resampleFrequency = moduleContext.useStoreValue("resamplingFrequency");
    const showStatistics = moduleContext.useStoreValue("showStatistics");
    const showRealizations = moduleContext.useStoreValue("showRealizations");
    const showHistorical = moduleContext.useStoreValue("showHistorical");
    const realizationsToInclude = moduleContext.useStoreValue("realizationsToInclude");

    const vectorQuery = useVectorDataQuery(
        vectorSpec?.ensembleIdent.getCaseUuid(),
        vectorSpec?.ensembleIdent.getEnsembleName(),
        vectorSpec?.vectorName,
        resampleFrequency,
        realizationsToInclude,
        showRealizations
    );

    const statisticsQuery = useStatisticalVectorDataQuery(
        vectorSpec?.ensembleIdent.getCaseUuid(),
        vectorSpec?.ensembleIdent.getEnsembleName(),
        vectorSpec?.vectorName,
        resampleFrequency,
        realizationsToInclude,
        showStatistics
    );

    const historicalQuery = useHistoricalVectorDataQuery(
        vectorSpec?.ensembleIdent.getCaseUuid(),
        vectorSpec?.ensembleIdent.getEnsembleName(),
        vectorSpec?.vectorName,
        resampleFrequency,
        showHistorical && vectorSpec?.hasHistoricalVector ? true : false
    );

    const ensembleSet = workbenchSession.getEnsembleSet();
    const ensemble = vectorSpec ? ensembleSet.findEnsemble(vectorSpec.ensembleIdent) : null;

    React.useEffect(
        function broadcast() {
            if (!ensemble) {
                return;
            }

            const dataGenerator = (): { key: number; value: number }[] => {
                const data: { key: number; value: number }[] = [];
                if (vectorQuery.data) {
                    vectorQuery.data.forEach((vec) => {
                        data.push({
                            key: vec.realization,
                            value: vec.values[0],
                        });
                    });
                }
                return data;
            };

            const channelMeta: BroadcastChannelMeta = {
                ensembleIdent: ensemble.getIdent(),
                description: `${ensemble.getDisplayName()} ${vectorSpec?.vectorName}`,
                unit: vectorQuery.data?.at(0)?.unit || "",
            };

            moduleContext.getChannel(BroadcastChannelNames.Realization_Value).broadcast(channelMeta, dataGenerator);
        },
        [vectorQuery.data, ensemble, vectorSpec, moduleContext]
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
    };

    function handleUnHover() {
        workbenchServices.publishGlobalData("global.hoverRealization", { realization: -1 });
    }

    const tracesDataArr: MyPlotData[] = [];

    if (showRealizations && vectorQuery.data && vectorQuery.data.length > 0) {
        for (let i = 0; i < vectorQuery.data.length; i++) {
            const vec = vectorQuery.data[i];
            const curveColor = vec.realization === subscribedPlotlyRealization?.realization ? "red" : "green";
            const lineWidth = vec.realization === subscribedPlotlyRealization?.realization ? 3 : 1;
            const lineShape = vec.is_rate ? "vh" : "linear";
            const trace: MyPlotData = {
                x: vec.timestamps,
                y: vec.values,
                name: `real-${vec.realization}`,
                realizationNumber: vec.realization,
                legendrank: vec.realization,
                type: "scatter",
                mode: "lines",
                line: { color: curveColor, width: lineWidth, shape: lineShape },
            };
            tracesDataArr.push(trace);
        }
    }

    if (showStatistics && statisticsQuery.data) {
        const lineShape = statisticsQuery.data.is_rate ? "vh" : "linear";
        for (const statValueObj of statisticsQuery.data.value_objects) {
            const trace: MyPlotData = {
                x: statisticsQuery.data.timestamps,
                y: statValueObj.values,
                name: statValueObj.statistic_function,
                legendrank: -1,
                type: "scatter",
                mode: "lines",
                line: { color: "lightblue", width: 2, dash: "dot", shape: lineShape },
            };
            tracesDataArr.push(trace);
        }
    }

    if (showHistorical && historicalQuery.data) {
        const lineShape = historicalQuery.data.is_rate ? "vh" : "linear";
        const trace: MyPlotData = {
            x: historicalQuery.data.timestamps,
            y: historicalQuery.data.values,
            name: "History",
            legendrank: -1,
            type: "scatter",
            mode: "lines",
            line: { color: "black", width: 2, shape: lineShape },
        };
        tracesDataArr.push(trace);
    }

    const hasGotAnyRequestedData = !!(
        (showRealizations && vectorQuery.data) ||
        (showStatistics && statisticsQuery.data) ||
        (showHistorical && historicalQuery.data)
    );

    let plotTitle = "N/A";
    if (vectorSpec && hasGotAnyRequestedData) {
        const unitString = determineUnitString(vectorQuery.data, statisticsQuery.data, historicalQuery.data);
        plotTitle = `${vectorSpec.vectorName} [${unitString}]`;
    }

    React.useEffect(
        function updateInstanceTitle() {
            if (ensemble && vectorSpec && hasGotAnyRequestedData) {
                const ensembleDisplayName = ensemble.getDisplayName();
                moduleContext.setInstanceTitle(`${ensembleDisplayName} - ${vectorSpec.vectorName}`);
            }
        },
        [hasGotAnyRequestedData, ensemble, vectorSpec, moduleContext]
    );

    const layout: Partial<Layout> = {
        width: wrapperDivSize.width,
        height: wrapperDivSize.height,
        title: plotTitle,
        margin: { t: 30, r: 0, l: 40, b: 40 },
    };

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
            <Plot
                data={tracesDataArr}
                layout={layout}
                config={{ scrollZoom: true }}
                onHover={handleHover}
                onUnhover={handleUnHover}
            />
        </div>
    );
};

function determineUnitString(
    realizationDataArr: VectorRealizationData_api[] | undefined,
    statisticData: VectorStatisticData_api | undefined,
    historicalData: VectorHistoricalData_api | undefined
): string {
    if (statisticData) {
        return statisticData.unit;
    }

    if (historicalData) {
        return historicalData.unit;
    }

    if (realizationDataArr && realizationDataArr.length > 0) {
        return realizationDataArr[0].unit;
    }

    return "";
}
