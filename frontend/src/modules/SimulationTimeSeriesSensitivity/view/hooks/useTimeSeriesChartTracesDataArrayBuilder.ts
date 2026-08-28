import { useAtomValue } from "jotai";

import type { VectorRealizationData_api, VectorStatisticSensitivityData_api } from "@api";
import { StatisticFunction_api } from "@api";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { ColorSet } from "@lib/utils/ColorSet";
import { createSensitivityColorMap } from "@modules/_shared/sensitivityColors";
import type { TimeSeriesPlotlyTrace } from "@modules/SimulationTimeSeriesSensitivity/view/utils/createTracesUtils";
import {
    createLineTrace,
    createLegendTrace,
    createRealizationLineTraces,
    createStatisticalLineTraces,
} from "@modules/SimulationTimeSeriesSensitivity/view/utils/createTracesUtils";

import {
    selectedSensitivityNamesAtom,
    showHistoricalAtom,
    showRealizationsAtom,
    showStatisticsAtom,
    vectorSpecificationAtom,
} from "../atoms/baseAtoms";
import {
    historicalVectorDataQueryAtom,
    statisticalVectorSensitivityDataQueryAtom,
    vectorDataQueryAtom,
} from "../atoms/queryAtoms";

export function useTimeSeriesChartTracesDataArrayBuilder(colorSet: ColorSet): TimeSeriesPlotlyTrace[] {
    const ensembleSet = useAtomValue(EnsembleSetAtom);
    const vectorSpecification = useAtomValue(vectorSpecificationAtom);
    const selectedSensitivityNames = useAtomValue(selectedSensitivityNamesAtom);
    const showStatistics = useAtomValue(showStatisticsAtom);
    const showRealizations = useAtomValue(showRealizationsAtom);
    const showHistorical = useAtomValue(showHistoricalAtom);

    const vectorDataQuery = useAtomValue(vectorDataQueryAtom);
    const statisticsQuery = useAtomValue(statisticalVectorSensitivityDataQueryAtom);
    const historicalQuery = useAtomValue(historicalVectorDataQueryAtom);

    const ensemble = vectorSpecification ? ensembleSet.findEnsemble(vectorSpecification.ensembleIdent) : null;

    const traceDataArr: TimeSeriesPlotlyTrace[] = [];
    if (!ensemble) {
        return traceDataArr;
    }

    const allSensitivityNamesInEnsemble = ensemble.getSensitivities()?.getSensitivityNames().sort() ?? [];
    if (!ensemble || selectedSensitivityNames.length === 0) {
        return traceDataArr;
    }

    if (ensemble && selectedSensitivityNames.length > 0) {
        const sensitivitiesColorMap = createSensitivityColorMap(allSensitivityNamesInEnsemble, colorSet);
        const sensitivitiesWithStatTraces = new Set<string>();
        const sensitivitiesWithRealizationTraces = new Set<string>();

        selectedSensitivityNames.forEach((sensitivityName) => {
            const color = sensitivitiesColorMap[sensitivityName];

            // Add statistics traces
            if (showStatistics && statisticsQuery.data) {
                const matchingCases: VectorStatisticSensitivityData_api[] = statisticsQuery.data.filter(
                    (stat) => stat.sensitivityName === sensitivityName,
                );
                const traces = createStatisticalLineTraces(matchingCases, StatisticFunction_api.MEAN, color);
                if (traces.length > 0) {
                    sensitivitiesWithStatTraces.add(sensitivityName);
                    traceDataArr.push(...traces);
                }
            }

            // Add realization traces
            const sensitivity = ensemble.getSensitivities()?.getSensitivityByName(sensitivityName);
            if (showRealizations && vectorDataQuery.data && sensitivity) {
                for (const sensCase of sensitivity.cases) {
                    const realsToInclude = sensCase.realizations;
                    const realizationData: VectorRealizationData_api[] = vectorDataQuery.data.filter((vec) =>
                        realsToInclude.includes(vec.realization),
                    );
                    if (realizationData.length > 0) {
                        sensitivitiesWithRealizationTraces.add(sensitivityName);
                        const traces = createRealizationLineTraces(realizationData, sensitivity.name, color);
                        traceDataArr.push(...traces);
                    }
                }
            }
        });

        // Add legend traces for sensitivities that need them
        selectedSensitivityNames.forEach((sensitivityName) => {
            const color = sensitivitiesColorMap[sensitivityName];
            const hasStatTraces = sensitivitiesWithStatTraces.has(sensitivityName);
            const hasRealizationTraces = sensitivitiesWithRealizationTraces.has(sensitivityName);

            // Use solid line as long as reals are shown, dashed only when just stats
            if (hasRealizationTraces) {
                traceDataArr.push(createLegendTrace(sensitivityName, color, "solid"));
            } else if (hasStatTraces) {
                traceDataArr.push(createLegendTrace(sensitivityName, color, "dash"));
            }
        });

        // Add history
        if (historicalQuery?.data && showHistorical) {
            traceDataArr.push(
                createLineTrace({
                    timestampsMsUtc: historicalQuery.data.timestampsUtcMs,
                    values: historicalQuery.data.values,
                    name: "history",
                    lineShape: "linear",
                    lineDash: "solid",
                    showLegend: true,
                    lineColor: "black",
                    lineWidth: 2,
                }),
            );
        }
    }

    return traceDataArr;
}
