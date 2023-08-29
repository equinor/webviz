import React from "react";
import { unstable_batchedUpdates } from "react-dom";

import { StatisticFunction_api, VectorRealizationData_api, VectorStatisticSensitivityData_api } from "@api";
import { BroadcastChannelMeta } from "@framework/Broadcaster";
import { Ensemble } from "@framework/Ensemble";
import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/TimestampUtils";
import { useElementSize } from "@lib/hooks/useElementSize";

import { indexOf } from "lodash";

import { BroadcastChannelNames } from "./channelDefs";
import { useStatisticalVectorSensitivityDataQuery, useVectorDataQuery } from "./queryHooks";
import { HoverInfo, TimeSeriesChart } from "./simulationTimeSeriesChart/chart";
import { TimeSeriesPlotlyTrace } from "./simulationTimeSeriesChart/traces";
import { createRealizationLineTraces, createSensitivityStatisticsTrace } from "./simulationTimeSeriesChart/traces";
import { State } from "./state";

export const view = ({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<State>) => {
    const renderCount = React.useRef(0);
    React.useEffect(function incrementRenderCount() {
        renderCount.current = renderCount.current + 1;
    });

    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const vectorSpec = moduleContext.useStoreValue("vectorSpec");
    const resampleFrequency = moduleContext.useStoreValue("resamplingFrequency");
    const showStatistics = moduleContext.useStoreValue("showStatistics");
    const showRealizations = moduleContext.useStoreValue("showRealizations");
    const selectedSensitivity = moduleContext.useStoreValue("selectedSensitivity");

    const [activeTimestampUtcMs, setActiveTimestampUtcMs] = React.useState<number | null>(null);
    const subscribedHoverTimestampUtcMs = useSubscribedValue("global.hoverTimestamp", workbenchServices);

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
            if (!ensemble || activeTimestampUtcMs === null) {
                return;
            }
            const dataGenerator = (): { key: number; value: number }[] => {
                const data: { key: number; value: number }[] = [];
                if (realizationsQuery.data) {
                    realizationsQuery.data.forEach((vec) => {
                        const indexOfTimeStamp = indexOf(vec.timestamps_utc_ms, activeTimestampUtcMs);
                        data.push({
                            key: vec.realization,
                            value: indexOfTimeStamp === -1 ? 0 : vec.values[indexOfTimeStamp],
                        });
                    });
                }
                return data;
            };

            const activeTimestampAsIsoString = timestampUtcMsToCompactIsoString(activeTimestampUtcMs);
            const channelMeta: BroadcastChannelMeta = {
                ensembleIdent: ensemble.getIdent(),
                description: `${ensemble.getDisplayName()} ${vectorSpec?.vectorName} ${activeTimestampAsIsoString}`,
                unit: realizationsQuery.data?.at(0)?.unit || "",
            };

            moduleContext.getChannel(BroadcastChannelNames.Realization_Value).broadcast(channelMeta, dataGenerator);
        },
        [realizationsQuery.data, ensemble, vectorSpec, activeTimestampUtcMs, moduleContext]
    );

    const traceDataArr = React.useMemo(() => {
        if (!ensemble || !selectedSensitivity) {
            return [];
        }
        return buildTraceDataArr(
            ensemble,
            selectedSensitivity,
            showStatistics,
            showRealizations,
            statisticsQuery.data,
            realizationsQuery.data
        );
    }, [ensemble, selectedSensitivity, showStatistics, showRealizations, statisticsQuery.data, realizationsQuery.data]);

    function handleHoverInChart(hoverInfo?: HoverInfo) {
        unstable_batchedUpdates(() => {
            if (hoverInfo) {
                if (hoverInfo.shiftKeyIsDown) {
                    setActiveTimestampUtcMs(hoverInfo.timestampUtcMs);
                }

                workbenchServices.publishGlobalData("global.hoverTimestamp", {
                    timestampUtcMs: hoverInfo.timestampUtcMs,
                });

                // if (typeof hoverInfo.realization === "number") {
                //     workbenchServices.publishGlobalData("global.hoverRealization", {
                //         realization: hoverInfo.realization,
                //     });
                // }
            } else {
                workbenchServices.publishGlobalData("global.hoverTimestamp", null);
                workbenchServices.publishGlobalData("global.hoverRealization", null);
            }
        });
    }

    function handleClickInChart(timestampUtcMs: number) {
        setActiveTimestampUtcMs(timestampUtcMs);
    }

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <TimeSeriesChart
                traceDataArr={traceDataArr}
                activeTimestampUtcMs={activeTimestampUtcMs ?? undefined}
                hoveredTimestampUtcMs={subscribedHoverTimestampUtcMs?.timestampUtcMs ?? undefined}
                onClick={handleClickInChart}
                onHover={handleHoverInChart}
                height={wrapperDivSize.height}
                width={wrapperDivSize.width}
            />
            <div className="absolute top-10 left-5 italic text-pink-400">(rc={renderCount.current})</div>
        </div>
    );
};

function buildTraceDataArr(
    ensemble: Ensemble,
    sensitivityName: string,
    showStatistics: boolean,
    showRealizations: boolean,
    perSensitivityStatisticData?: VectorStatisticSensitivityData_api[],
    perRealizationData?: VectorRealizationData_api[]
): TimeSeriesPlotlyTrace[] {
    const sensitivity = ensemble.getSensitivities()?.getSensitivityByName(sensitivityName);
    if (!sensitivity) {
        return [];
    }

    const traceDataArr: TimeSeriesPlotlyTrace[] = [];

    if (perSensitivityStatisticData) {
        const meanCase = perSensitivityStatisticData.filter((stat) => stat.sensitivity_name === "rms_seed")[0];
        const meanObj = meanCase.value_objects.filter(
            (statObj) => statObj.statistic_function === StatisticFunction_api.MEAN
        );
        traceDataArr.push(
            createSensitivityStatisticsTrace(
                meanCase.timestamps_utc_ms,
                meanObj[0].values,
                `reference ${meanCase.sensitivity_name}`,
                "linear",
                "solid",
                "black"
            )
        );

        if (showStatistics) {
            const sensCases = perSensitivityStatisticData.filter((stat) => stat.sensitivity_name === sensitivityName);
            if (sensCases) {
                for (const caseEntry of sensCases) {
                    const meanObj = caseEntry.value_objects.filter(
                        (statObj) => statObj.statistic_function === StatisticFunction_api.MEAN
                    );
                    traceDataArr.push(
                        createSensitivityStatisticsTrace(
                            caseEntry.timestamps_utc_ms,
                            meanObj[0].values,
                            caseEntry.sensitivity_case,
                            "linear",
                            "dash"
                        )
                    );
                }
            }
        }
    }

    if (showRealizations && perRealizationData) {
        for (const sensCase of sensitivity.cases) {
            const realsToInclude = sensCase.realizations;
            const realizationData: VectorRealizationData_api[] = perRealizationData.filter((vec) =>
                realsToInclude.includes(vec.realization)
            );
            const traces = createRealizationLineTraces(realizationData);
            traceDataArr.push(...traces);
        }
    }

    return traceDataArr;
}
