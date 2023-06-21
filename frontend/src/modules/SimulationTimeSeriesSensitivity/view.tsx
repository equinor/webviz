import React from "react";
import Plot from "react-plotly.js";

import { VectorRealizationData_api } from "@api";
import { BroadcastChannelMeta } from "@framework/Broadcaster";
import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useElementSize } from "@lib/hooks/useElementSize";

import { indexOf } from "lodash";
import { Layout, PlotHoverEvent } from "plotly.js";

import { BroadcastChannelNames } from "./channelDefs";
import { useStatisticalVectorSensitivityDataQuery, useVectorDataQuery } from "./queryHooks";
import {
    TimeSeriesPlotData,
    createRealizationLineTraces,
    sensitivityStatisticsTrace,
} from "./simulationTimeSeriesChart/traces";
import { State } from "./state";

import { StatisticFunction } from "../../api/models/StatisticFunction";

export const view = ({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const vectorSpec = moduleContext.useStoreValue("vectorSpec");
    const resampleFrequency = moduleContext.useStoreValue("resamplingFrequency");
    const showStatistics = moduleContext.useStoreValue("showStatistics");
    const showRealizations = moduleContext.useStoreValue("showRealizations");
    const selectedSensitivity = moduleContext.useStoreValue("selectedSensitivity");

    const [hoveredTimestamp, setHoveredTimestamp] = React.useState<string | null>(null);
    const [traceDataArr, setTraceDataArr] = React.useState<TimeSeriesPlotData[]>([]);

    const realizationsQuery = useVectorDataQuery(
        vectorSpec?.ensembleIdent.getCaseUuid(),
        vectorSpec?.ensembleIdent.getEnsembleName(),
        vectorSpec?.vectorName,
        resampleFrequency,
        null
    );

    const statisticsQuery = useStatisticalVectorSensitivityDataQuery(
        vectorSpec?.ensembleIdent.getCaseUuid(),
        vectorSpec?.ensembleIdent.getEnsembleName(),
        vectorSpec?.vectorName,
        resampleFrequency,
        showStatistics
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
                if (realizationsQuery.data) {
                    realizationsQuery.data.forEach((vec) => {
                        const indexOfTimeStamp = indexOf(vec.timestamps, hoveredTimestamp);
                        data.push({
                            key: vec.realization,
                            value: indexOfTimeStamp === -1 ? 0 : vec.values[indexOfTimeStamp],
                        });
                    });
                }
                // hack
                if (data.length === 0) {
                    data.push({ key: 1, value: 1 });
                }
                return data;
            };

            const channelMeta: BroadcastChannelMeta = {
                ensembleIdent: ensemble.getIdent(),
                description: `${ensemble.getDisplayName()} ${vectorSpec?.vectorName}`,
                unit: realizationsQuery.data?.at(0)?.unit || "",
            };

            moduleContext.getChannel(BroadcastChannelNames.Realization_Value).broadcast(channelMeta, dataGenerator);
        },
        [realizationsQuery.data, ensemble, vectorSpec, hoveredTimestamp, moduleContext]
    );

    React.useEffect(() => {
        const traceDataArr: TimeSeriesPlotData[] = [];

        if (selectedSensitivity && vectorSpec) {
            const ensemble = ensembleSet.findEnsemble(vectorSpec.ensembleIdent);
            if (ensemble) {
                const sensitivity = ensemble.getSensitivities()?.getSensitivityByName(selectedSensitivity);
                if (sensitivity) {
                    if (statisticsQuery.data) {
                        const meanCase = statisticsQuery.data.filter((stat) => stat.sensitivity_name === "rms_seed")[0];
                        const meanObj = meanCase.value_objects.filter(
                            (statObj) => statObj.statistic_function === StatisticFunction.MEAN
                        );
                        traceDataArr.push(
                            sensitivityStatisticsTrace(
                                meanCase.timestamps,
                                meanObj[0].values,
                                `reference ${meanCase.sensitivity_name}`,
                                "linear",
                                "solid",
                                "black"
                            )
                        );
                        if (showStatistics) {
                            const cases = statisticsQuery.data.filter(
                                (stat) => stat.sensitivity_name === selectedSensitivity
                            );
                            if (cases) {
                                for (const caseIdent of cases) {
                                    const meanObj = caseIdent.value_objects.filter(
                                        (statObj) => statObj.statistic_function === StatisticFunction.MEAN
                                    );
                                    traceDataArr.push(
                                        sensitivityStatisticsTrace(
                                            caseIdent.timestamps,
                                            meanObj[0].values,
                                            caseIdent.sensitivity_case,
                                            "linear",
                                            "dash"
                                        )
                                    );
                                }
                            }
                        }
                    }
                    if (showRealizations && realizationsQuery.data) {
                        for (const caseIdent of sensitivity.cases) {
                            const realsToInclude = caseIdent.realizations;
                            const realizationData: VectorRealizationData_api[] = realizationsQuery.data.filter((vec) =>
                                realsToInclude.includes(vec.realization)
                            );
                            const traces = createRealizationLineTraces(realizationData);
                            traceDataArr.push(...traces);
                        }
                    }
                }
            }
        }
        setTraceDataArr(traceDataArr);
    }, [vectorSpec, showRealizations, showStatistics, selectedSensitivity]);

    const subscribedPlotlyTimeStamp = useSubscribedValue("global.hoverTimestamp", workbenchServices);

    const handleHover = (e: PlotHoverEvent) => {
        if (e.xvals.length > 0 && typeof e.xvals[0]) {
            // workbenchServices.publishGlobalData("global.hoverTimestamp", { timestamp: e.xvals[0] as number });

            // // Big hack
            // console.log("DATE DATE DATE", e.points[0].x);
            // console.log(e);
            // const hoverDate = new Date(e.xvals[0] as number);
            // const hoverDateString = hoverDate.toISOString().split(".")[0].split("T")[0] + "T00:00:00.000";
            setHoveredTimestamp(e.points[0].x as string);
        }
        const curveData = e.points[0].data as TimeSeriesPlotData;
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

    let unitString = "";

    let title = "N/A";
    const hasGotAnyRequestedData = realizationsQuery.data;
    if (ensemble && vectorSpec && hasGotAnyRequestedData) {
        const ensembleDisplayName = ensemble.getDisplayName();
        title = `${vectorSpec.vectorName} [${unitString}] - ${ensembleDisplayName}`;
    }

    const layout: Partial<Layout> = {
        width: wrapperDivSize.width,
        height: wrapperDivSize.height,
        title: title,
        xaxis: {
            type: "category",
        },
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
                data={traceDataArr}
                layout={layout}
                config={{ scrollZoom: true }}
                onHover={handleHover}
                onUnhover={handleUnHover}
            />
            <div className="absolute bottom-5 right-5 italic text-pink-400">{moduleContext.getInstanceIdString()}</div>
        </div>
    );
};
