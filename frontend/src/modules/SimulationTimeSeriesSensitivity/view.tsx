import React from "react";

import { VectorRealizationData_api } from "@api";
import { StatisticFunction_api } from "@api";
import { BroadcastChannelMeta } from "@framework/Broadcaster";
import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";

import { indexOf } from "lodash";

import { BroadcastChannelNames } from "./channelDefs";
import { useStatisticalVectorSensitivityDataQuery, useVectorDataQuery } from "./queryHooks";
import { TimeSeriesChart } from "./simulationTimeSeriesChart/chart";
import {
    TimeSeriesPlotlyTrace,
    createRealizationLineTraces,
    sensitivityStatisticsTrace,
} from "./simulationTimeSeriesChart/traces";
import { State } from "./state";

export const view = ({ moduleContext, workbenchSession }: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const vectorSpec = moduleContext.useStoreValue("vectorSpec");
    const resampleFrequency = moduleContext.useStoreValue("resamplingFrequency");
    const showStatistics = moduleContext.useStoreValue("showStatistics");
    const showRealizations = moduleContext.useStoreValue("showRealizations");
    const selectedSensitivity = moduleContext.useStoreValue("selectedSensitivity");

    const [hoveredTimestamp, setHoveredTimestamp] = React.useState<string | null>(null);
    const [traceDataArr, setTraceDataArr] = React.useState<TimeSeriesPlotlyTrace[]>([]);

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

    // Broadcast the data to the realization data channel
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
                return data;
            };

            const channelMeta: BroadcastChannelMeta = {
                ensembleIdent: ensemble.getIdent(),
                description: `${ensemble.getDisplayName()} ${vectorSpec?.vectorName} ${hoveredTimestamp}`,
                unit: realizationsQuery.data?.at(0)?.unit || "",
            };

            moduleContext.getChannel(BroadcastChannelNames.Realization_Value).broadcast(channelMeta, dataGenerator);
        },
        [realizationsQuery.data, ensemble, vectorSpec, hoveredTimestamp, moduleContext]
    );

    // Update the Plotly trace data
    React.useEffect(() => {
        const traceDataArr: TimeSeriesPlotlyTrace[] = [];
        if (selectedSensitivity && vectorSpec) {
            const ensemble = ensembleSet.findEnsemble(vectorSpec.ensembleIdent);
            if (ensemble) {
                const sensitivity = ensemble.getSensitivities()?.getSensitivityByName(selectedSensitivity);
                if (sensitivity) {
                    if (statisticsQuery.data) {
                        const meanCase = statisticsQuery.data.filter((stat) => stat.sensitivity_name === "rms_seed")[0];
                        const meanObj = meanCase.value_objects.filter(
                            (statObj) => statObj.statistic_function === StatisticFunction_api.MEAN
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
                                        (statObj) => statObj.statistic_function === StatisticFunction_api.MEAN
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
    }, [realizationsQuery.data, statisticsQuery.data, showRealizations, showStatistics, selectedSensitivity]);

    const handleHover = (dateString: string) => {
        setHoveredTimestamp(dateString);
    };

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <TimeSeriesChart
                traceDataArr={traceDataArr}
                onHover={handleHover}
                height={wrapperDivSize.height}
                width={wrapperDivSize.width}
            />
        </div>
    );
};
