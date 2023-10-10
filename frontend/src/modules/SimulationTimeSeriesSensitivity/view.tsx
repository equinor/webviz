import React from "react";

import { StatisticFunction_api, VectorRealizationData_api, VectorStatisticSensitivityData_api } from "@api";
import { BroadcastChannelData, BroadcastChannelMeta } from "@framework/Broadcaster";
import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { useElementSize } from "@lib/hooks/useElementSize";
import { createSensitivityColorMap } from "@modules/_shared/sensitivityColors";

import { indexOf } from "lodash";

import { BroadcastChannelNames } from "./channelDefs";
import {
    useHistoricalVectorDataQuery,
    useStatisticalVectorSensitivityDataQuery,
    useVectorDataQuery,
} from "./queryHooks";
import { HoverInfo, TimeSeriesChart } from "./simulationTimeSeriesChart/chart";
import { TimeSeriesPlotlyTrace, createStatisticalLineTraces } from "./simulationTimeSeriesChart/traces";
import { createLineTrace, createRealizationLineTraces } from "./simulationTimeSeriesChart/traces";
import { State } from "./state";

export const view = ({
    moduleContext,
    workbenchSession,
    workbenchSettings,
    workbenchServices,
}: ModuleFCProps<State>) => {
    // Leave this in until we get a feeling for React18/Plotly
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
    const selectedSensitivities = moduleContext.useStoreValue("selectedSensitivities");
    const showHistorical = moduleContext.useStoreValue("showHistorical");
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

    const historicalQuery = useHistoricalVectorDataQuery(
        vectorSpec?.ensembleIdent.getCaseUuid(),
        vectorSpec?.ensembleIdent.getEnsembleName(),
        vectorSpec?.vectorName,
        resampleFrequency,
        vectorSpec?.hasHistorical ? showHistorical : false
    );
    const ensembleSet = workbenchSession.getEnsembleSet();
    const ensemble = vectorSpec ? ensembleSet.findEnsemble(vectorSpec.ensembleIdent) : null;

    // Set the active timestamp to the last timestamp in the data if it is not already set
    const lastTimestampUtcMs = statisticsQuery.data?.at(0)?.timestamps_utc_ms.slice(-1)[0] ?? null;
    if (lastTimestampUtcMs !== null && activeTimestampUtcMs === null) {
        setActiveTimestampUtcMs(lastTimestampUtcMs);
    }

    // Broadcast the data to the realization data channel
    React.useEffect(
        function broadcast() {
            if (!ensemble || !realizationsQuery.data || activeTimestampUtcMs === null) {
                return;
            }
            const dataGenerator = (): BroadcastChannelData[] => {
                const data: BroadcastChannelData[] = [];
                realizationsQuery.data.forEach((vec) => {
                    const indexOfTimeStamp = indexOf(vec.timestamps_utc_ms, activeTimestampUtcMs);
                    data.push({
                        key: vec.realization,
                        value: indexOfTimeStamp === -1 ? 0 : vec.values[indexOfTimeStamp],
                    });
                });
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
        [ensemble, vectorSpec, realizationsQuery.data, activeTimestampUtcMs, moduleContext]
    );
    const colorSet = workbenchSettings.useColorSet();

    const allSensitivityNamesInEnsemble = ensemble?.getSensitivitySet()?.getSensitivityNames().sort() ?? [];

    const traceDataArr: TimeSeriesPlotlyTrace[] = [];
    if (ensemble && selectedSensitivities && selectedSensitivities.length > 0) {
        const sensitivitiesColorMap = createSensitivityColorMap(allSensitivityNamesInEnsemble, colorSet);
        selectedSensitivities.forEach((sensitivityName) => {
            const color = sensitivitiesColorMap[sensitivityName];

            // Add statistics traces
            if (showStatistics && statisticsQuery.data) {
                const matchingCases: VectorStatisticSensitivityData_api[] = statisticsQuery.data.filter(
                    (stat) => stat.sensitivity_name === sensitivityName
                );
                const traces = createStatisticalLineTraces(matchingCases, StatisticFunction_api.MEAN, color);
                traceDataArr.push(...traces);
            }

            // Add realization traces
            const sensitivity = ensemble.getSensitivitySet()?.getSensitivityByName(sensitivityName);
            if (showRealizations && realizationsQuery.data && sensitivity) {
                for (const sensCase of sensitivity.cases) {
                    const realsToInclude = sensCase.realizations;
                    const realizationData: VectorRealizationData_api[] = realizationsQuery.data.filter((vec) =>
                        realsToInclude.includes(vec.realization)
                    );
                    const traces = createRealizationLineTraces(realizationData, sensitivity.name, color);
                    traceDataArr.push(...traces);
                }
            }
        });
        // Add history
        if (historicalQuery?.data && showHistorical) {
            traceDataArr.push(
                createLineTrace({
                    timestampsMsUtc: historicalQuery.data.timestamps_utc_ms,
                    values: historicalQuery.data.values,
                    name: "history",
                    lineShape: "linear",
                    lineDash: "solid",
                    showLegend: true,
                    lineColor: "black",
                    lineWidth: 2,
                })
            );
        }
    }

    function handleHoverInChart(hoverInfo: HoverInfo | null) {
        if (hoverInfo) {
            if (hoverInfo.shiftKeyIsDown) {
                setActiveTimestampUtcMs(hoverInfo.timestampUtcMs);
            }

            workbenchServices.publishGlobalData("global.hoverTimestamp", {
                timestampUtcMs: hoverInfo.timestampUtcMs,
            });

            if (typeof hoverInfo.realization === "number") {
                workbenchServices.publishGlobalData("global.hoverRealization", {
                    realization: hoverInfo.realization,
                });
            }
        } else {
            workbenchServices.publishGlobalData("global.hoverTimestamp", null);
            workbenchServices.publishGlobalData("global.hoverRealization", null);
        }
    }

    function handleClickInChart(timestampUtcMs: number) {
        setActiveTimestampUtcMs(timestampUtcMs);
    }

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <TimeSeriesChart
                traceDataArr={traceDataArr}
                title={vectorSpec?.vectorName ?? ""}
                uirevision={vectorSpec?.vectorName}
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
