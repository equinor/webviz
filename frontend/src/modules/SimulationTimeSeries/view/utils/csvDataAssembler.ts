import type {
    SummaryVectorObservations_api,
    VectorHistoricalData_api,
    VectorRealizationData_api,
    VectorStatisticData_api,
} from "@api";
import { StatisticFunction_api } from "@api";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { convertRowsToCsvString } from "@lib/utils/csvUtil";

import { FanchartStatisticOption, StatisticFunctionEnumToStringMapping, VisualizationMode } from "../../typesAndEnums";
import type { StatisticsSelection } from "../../typesAndEnums";

function sanitizeFilename(name: string): string {
    return name.replace(/[:/\\]/g, "_");
}

function getSelectedStatisticFunctions(
    visualizationMode: VisualizationMode,
    statisticsSelection: StatisticsSelection,
): StatisticFunction_api[] {
    if (visualizationMode === VisualizationMode.STATISTICAL_FANCHART) {
        const functions: StatisticFunction_api[] = [];
        if (statisticsSelection.FanchartStatisticsSelection.includes(FanchartStatisticOption.MEAN)) {
            functions.push(StatisticFunction_api.MEAN);
        }
        if (statisticsSelection.FanchartStatisticsSelection.includes(FanchartStatisticOption.MIN_MAX)) {
            functions.push(StatisticFunction_api.MIN);
            functions.push(StatisticFunction_api.MAX);
        }
        if (statisticsSelection.FanchartStatisticsSelection.includes(FanchartStatisticOption.P10_P90)) {
            functions.push(StatisticFunction_api.P10);
            functions.push(StatisticFunction_api.P90);
        }
        return functions;
    }
    // STATISTICAL_LINES or STATISTICS_AND_REALIZATIONS
    return statisticsSelection.IndividualStatisticsSelection;
}

function assembleRealizationCsvFiles(
    realizationData: { ensembleDisplayName: string; vectorName: string; data: VectorRealizationData_api[] }[],
): { filename: string; csvContent: string }[] {
    const byVector = new Map<string, { ensembleDisplayName: string; data: VectorRealizationData_api[] }[]>();
    for (const entry of realizationData) {
        const existing = byVector.get(entry.vectorName) ?? [];
        existing.push({ ensembleDisplayName: entry.ensembleDisplayName, data: entry.data });
        byVector.set(entry.vectorName, existing);
    }

    const files: { filename: string; csvContent: string }[] = [];
    for (const [vectorName, entries] of byVector) {
        const headerRows = [["ENSEMBLE", "DATE", "REAL", vectorName]];
        const dataRows: (string | number)[][] = [];

        for (const entry of entries) {
            for (const realization of entry.data) {
                for (let i = 0; i < realization.timestampsUtcMs.length; i++) {
                    dataRows.push([
                        entry.ensembleDisplayName,
                        timestampUtcMsToCompactIsoString(realization.timestampsUtcMs[i]),
                        realization.realization,
                        realization.values[i],
                    ]);
                }
            }
        }

        const filename = `${sanitizeFilename(vectorName)}_realizations.csv`;
        files.push({ filename, csvContent: convertRowsToCsvString(headerRows, dataRows) });
    }

    return files;
}

function assembleStatisticsCsvFiles(
    statisticsData: { ensembleDisplayName: string; vectorName: string; data: VectorStatisticData_api }[],
    selectedFunctions: StatisticFunction_api[],
): { filename: string; csvContent: string }[] {
    if (selectedFunctions.length === 0) return [];

    const byVector = new Map<string, { ensembleDisplayName: string; data: VectorStatisticData_api }[]>();
    for (const entry of statisticsData) {
        const existing = byVector.get(entry.vectorName) ?? [];
        existing.push({ ensembleDisplayName: entry.ensembleDisplayName, data: entry.data });
        byVector.set(entry.vectorName, existing);
    }

    const files: { filename: string; csvContent: string }[] = [];
    for (const [vectorName, entries] of byVector) {
        const headerRow1 = ["ENSEMBLE", "DATE", ...selectedFunctions.map(() => vectorName)];
        const headerRow2 = ["", "", ...selectedFunctions.map((fn) => StatisticFunctionEnumToStringMapping[fn])];

        const dataRows: (string | number)[][] = [];

        for (const entry of entries) {
            const statValueMap = new Map<StatisticFunction_api, number[]>();
            for (const vo of entry.data.valueObjects) {
                if (selectedFunctions.includes(vo.statisticFunction)) {
                    statValueMap.set(vo.statisticFunction, vo.values);
                }
            }

            for (let i = 0; i < entry.data.timestampsUtcMs.length; i++) {
                const row: (string | number)[] = [
                    entry.ensembleDisplayName,
                    timestampUtcMsToCompactIsoString(entry.data.timestampsUtcMs[i]),
                ];
                for (const fn of selectedFunctions) {
                    const values = statValueMap.get(fn);
                    row.push(values ? values[i] : "");
                }
                dataRows.push(row);
            }
        }

        const filename = `${sanitizeFilename(vectorName)}_statistics.csv`;
        files.push({ filename, csvContent: convertRowsToCsvString([headerRow1, headerRow2], dataRows) });
    }

    return files;
}

function assembleHistoricalCsvFiles(
    historicalData: { vectorName: string; data: VectorHistoricalData_api }[],
): { filename: string; csvContent: string }[] {
    const byVector = new Map<string, VectorHistoricalData_api>();
    for (const entry of historicalData) {
        if (!byVector.has(entry.vectorName)) {
            byVector.set(entry.vectorName, entry.data);
        }
    }

    const files: { filename: string; csvContent: string }[] = [];
    for (const [vectorName, data] of byVector) {
        const headerRows = [["DATE", vectorName]];
        const dataRows: (string | number)[][] = [];

        for (let i = 0; i < data.timestampsUtcMs.length; i++) {
            dataRows.push([timestampUtcMsToCompactIsoString(data.timestampsUtcMs[i]), data.values[i]]);
        }

        const filename = `${sanitizeFilename(vectorName)}_historical.csv`;
        files.push({ filename, csvContent: convertRowsToCsvString(headerRows, dataRows) });
    }

    return files;
}

function assembleObservationCsvFiles(
    observationData: { vectorName: string; data: SummaryVectorObservations_api }[],
): { filename: string; csvContent: string }[] {
    const byVector = new Map<string, SummaryVectorObservations_api>();
    for (const entry of observationData) {
        if (!byVector.has(entry.vectorName)) {
            byVector.set(entry.vectorName, entry.data);
        }
    }

    const files: { filename: string; csvContent: string }[] = [];
    for (const [vectorName, data] of byVector) {
        const headerRows = [["DATE", vectorName, "ERROR", "LABEL"]];
        const dataRows: (string | number)[][] = [];

        for (const obs of data.observations) {
            dataRows.push([obs.date, obs.value, obs.error, obs.label]);
        }

        const filename = `${sanitizeFilename(vectorName)}_observations.csv`;
        files.push({ filename, csvContent: convertRowsToCsvString(headerRows, dataRows) });
    }

    return files;
}

export function assembleCsvFiles(
    visualizationMode: VisualizationMode,
    realizationData: { ensembleDisplayName: string; vectorName: string; data: VectorRealizationData_api[] }[],
    statisticsData: { ensembleDisplayName: string; vectorName: string; data: VectorStatisticData_api }[],
    historicalData: { vectorName: string; data: VectorHistoricalData_api }[],
    observationData: { vectorName: string; data: SummaryVectorObservations_api }[],
    statisticsSelection: StatisticsSelection,
    showHistorical: boolean,
    showObservations: boolean,
): { filename: string; csvContent: string }[] {
    const files: { filename: string; csvContent: string }[] = [];

    const includeRealizations =
        visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS ||
        visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS;
    const includeStatistics =
        visualizationMode === VisualizationMode.STATISTICAL_LINES ||
        visualizationMode === VisualizationMode.STATISTICAL_FANCHART ||
        visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS;

    if (includeRealizations) {
        files.push(...assembleRealizationCsvFiles(realizationData));
    }

    if (includeStatistics) {
        const selectedFunctions = getSelectedStatisticFunctions(visualizationMode, statisticsSelection);
        files.push(...assembleStatisticsCsvFiles(statisticsData, selectedFunctions));
    }

    if (showHistorical) {
        files.push(...assembleHistoricalCsvFiles(historicalData));
    }

    if (showObservations) {
        files.push(...assembleObservationCsvFiles(observationData));
    }

    return files;
}

/**
 * Temporary dummy assembler for proof of concept.
 * Will be replaced with real data assembly from loaded atoms.
 */
export function assembleCsvDummyFiles(): { filename: string; content: string }[] {
    const headerRows = [["ENSEMBLE", "DATE", "REAL", "FOPT"]];
    const dataRows: (string | number)[][] = [
        ["iter-0", "2020-01-01", 0, 100.5],
        ["iter-0", "2020-01-01", 1, 102.3],
        ["iter-0", "2020-02-01", 0, 200.1],
        ["iter-0", "2020-02-01", 1, 198.7],
        ["iter-1", "2020-01-01", 0, 99.8],
        ["iter-1", "2020-02-01", 0, 195.2],
    ];

    return [
        {
            filename: "FOPT_realizations.csv",
            content: convertRowsToCsvString(headerRows, dataRows),
        },
    ];
}
