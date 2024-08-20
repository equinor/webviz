import React from "react";

import { StatisticFunction_api, VectorRealizationData_api, VectorStatisticSensitivityData_api } from "@api";
import { ModuleViewProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useElementSize } from "@lib/hooks/useElementSize";
import { createSensitivityColorMap } from "@modules/_shared/sensitivityColors";

import { indexOf } from "lodash";

import { ChannelIds } from "./channelDefs";
import { Interfaces } from "./interfaces";
import {
    useHistoricalVectorDataQuery,
    useStatisticalVectorSensitivityDataQuery,
    useVectorDataQuery,
} from "./queryHooks";
import { HoverInfo, TimeSeriesChart } from "./simulationTimeSeriesChart/chart";
import { TimeSeriesPlotlyTrace, createStatisticalLineTraces } from "./simulationTimeSeriesChart/traces";
import { createLineTrace, createRealizationLineTraces } from "./simulationTimeSeriesChart/traces";

export const View = ({
    viewContext,
    workbenchSession,
    workbenchSettings,
    workbenchServices,
}: ModuleViewProps<Interfaces>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const vectorSpec = viewContext.useSettingsToViewInterfaceValue("vectorSpec");
    const resampleFrequency = viewContext.useSettingsToViewInterfaceValue("resamplingFrequency");
    const showStatistics = viewContext.useSettingsToViewInterfaceValue("showStatistics");
    const showRealizations = viewContext.useSettingsToViewInterfaceValue("showRealizations");
    const selectedSensitivities = viewContext.useSettingsToViewInterfaceValue("selectedSensitivities");
    const showHistorical = viewContext.useSettingsToViewInterfaceValue("showHistorical");
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

    function dataGenerator() {
        const data: { key: number; value: number }[] = [];
        if (vectorSpec && realizationsQuery.data && ensemble) {
            realizationsQuery.data.forEach((vec) => {
                const indexOfTimestamp = indexOf(vec.timestamps_utc_ms, activeTimestampUtcMs);
                data.push({
                    key: vec.realization,
                    value: indexOfTimestamp === -1 ? 0 : vec.values[indexOfTimestamp],
                });
            });
        }
        return {
            data,
            metaData: {
                ensembleIdentString: ensemble?.getIdent().toString() ?? "",
                unit: "unit",
            },
        };
    }

    viewContext.usePublishChannelContents({
        channelIdString: ChannelIds.REALIZATION_VALUE,
        dependencies: [vectorSpec, realizationsQuery.data, ensemble, activeTimestampUtcMs],
        contents: [
            { contentIdString: vectorSpec?.vectorName ?? "", displayName: vectorSpec?.vectorName ?? "", dataGenerator },
        ],
    });

    const colorSet = workbenchSettings.useColorSet();

    const allSensitivityNamesInEnsemble = ensemble?.getSensitivities()?.getSensitivityNames().sort() ?? [];

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
            const sensitivity = ensemble.getSensitivities()?.getSensitivityByName(sensitivityName);
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
        </div>
    );
};
