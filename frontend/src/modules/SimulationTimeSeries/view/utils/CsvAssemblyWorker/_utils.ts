import {
    StatisticFunction_api,
    type SummaryVectorObservations_api,
    type VectorHistoricalData_api,
    type VectorRealizationData_api,
    type VectorStatisticData_api,
} from "@api";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { convertRowsToCsvContentString } from "@lib/utils/csvConvertUtils";
import type { StatisticsSelection } from "@modules/SimulationTimeSeries/typesAndEnums";
import {
    FanchartStatisticOption,
    StatisticFunctionEnumToStringMapping,
    VisualizationMode,
} from "@modules/SimulationTimeSeries/typesAndEnums";

function sanitizeFilename(name: string): string {
    return name.replace(/[:/\\]/g, "_");
}

function assembleCsvFilesPerVector<T>(
    inputData: { ensembleDisplayName: string; vectorName: string; data: T }[],
    filenameSuffix: string,
    buildCsvRows: (
        vectorName: string,
        entries: { ensembleDisplayName: string; data: T }[],
    ) => { headerRows: string[][]; dataRows: (string | number)[][] },
): { filename: string; csvContent: string }[] {
    const byVector = new Map<string, { ensembleDisplayName: string; data: T }[]>();
    for (const entry of inputData) {
        const existing = byVector.get(entry.vectorName) ?? [];
        existing.push({ ensembleDisplayName: entry.ensembleDisplayName, data: entry.data });
        byVector.set(entry.vectorName, existing);
    }

    const files: { filename: string; csvContent: string }[] = [];
    for (const [vectorName, entries] of byVector) {
        const { headerRows, dataRows } = buildCsvRows(vectorName, entries);
        const filename = `${sanitizeFilename(vectorName)}_${filenameSuffix}.csv`;
        files.push({ filename, csvContent: convertRowsToCsvContentString(headerRows, dataRows) });
    }

    return files;
}

export function getSelectedStatisticFunctions(
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

export function assembleRealizationCsvFiles(
    realizationData: { ensembleDisplayName: string; vectorName: string; data: VectorRealizationData_api[] }[],
): { filename: string; csvContent: string }[] {
    return assembleCsvFilesPerVector(realizationData, "realizations", buildRealizationCsvRows);
}

function buildRealizationCsvRows(
    vectorName: string,
    entries: { ensembleDisplayName: string; data: VectorRealizationData_api[] }[],
): { headerRows: string[][]; dataRows: (string | number)[][] } {
    const headerRows: string[][] = [["ENSEMBLE", "DATE", "REAL", vectorName]];
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

    return { headerRows, dataRows };
}

export function assembleStatisticsCsvFiles(
    statisticsData: { ensembleDisplayName: string; vectorName: string; data: VectorStatisticData_api }[],
    statisticFunctions: StatisticFunction_api[],
): { filename: string; csvContent: string }[] {
    if (statisticFunctions.length === 0) return [];

    // Use arrow function for calling buildStatisticsCsvRows to capture statisticFunctions
    return assembleCsvFilesPerVector(statisticsData, "statistics", (vectorName, entries) =>
        buildStatisticsCsvRows(vectorName, entries, statisticFunctions),
    );
}

function buildStatisticsCsvRows(
    vectorName: string,
    entries: { ensembleDisplayName: string; data: VectorStatisticData_api }[],
    statisticFunctions: StatisticFunction_api[],
): { headerRows: string[][]; dataRows: (string | number)[][] } {
    const headerRows: string[][] = [
        ["ENSEMBLE", "DATE", ...statisticFunctions.map(() => vectorName)],
        ["", "", ...statisticFunctions.map((fn) => StatisticFunctionEnumToStringMapping[fn])],
    ];
    const dataRows: (string | number)[][] = [];

    for (const entry of entries) {
        const statValueMap = new Map<StatisticFunction_api, number[]>();
        for (const vo of entry.data.valueObjects) {
            if (statisticFunctions.includes(vo.statisticFunction)) {
                statValueMap.set(vo.statisticFunction, vo.values);
            }
        }

        for (let i = 0; i < entry.data.timestampsUtcMs.length; i++) {
            const row: (string | number)[] = [
                entry.ensembleDisplayName,
                timestampUtcMsToCompactIsoString(entry.data.timestampsUtcMs[i]),
            ];
            for (const fn of statisticFunctions) {
                const values = statValueMap.get(fn);
                row.push(values ? values[i] : "");
            }
            dataRows.push(row);
        }
    }

    return { headerRows, dataRows };
}

export function assembleHistoricalCsvFiles(
    historicalData: { ensembleDisplayName: string; vectorName: string; data: VectorHistoricalData_api }[],
): { filename: string; csvContent: string }[] {
    return assembleCsvFilesPerVector(historicalData, "historical", buildHistoricalCsvRows);
}

function buildHistoricalCsvRows(
    vectorName: string,
    entries: { ensembleDisplayName: string; data: VectorHistoricalData_api }[],
): { headerRows: string[][]; dataRows: (string | number)[][] } {
    const headerRows: string[][] = [["ENSEMBLE", "DATE", vectorName]];
    const dataRows: (string | number)[][] = [];

    for (const entry of entries) {
        for (let i = 0; i < entry.data.timestampsUtcMs.length; i++) {
            dataRows.push([
                entry.ensembleDisplayName,
                timestampUtcMsToCompactIsoString(entry.data.timestampsUtcMs[i]),
                entry.data.values[i],
            ]);
        }
    }

    return { headerRows, dataRows };
}

export function assembleObservationCsvFiles(
    observationData: { ensembleDisplayName: string; vectorName: string; data: SummaryVectorObservations_api }[],
): { filename: string; csvContent: string }[] {
    return assembleCsvFilesPerVector(observationData, "observations", buildObservationCsvRows);
}

function buildObservationCsvRows(
    vectorName: string,
    entries: { ensembleDisplayName: string; data: SummaryVectorObservations_api }[],
): { headerRows: string[][]; dataRows: (string | number)[][] } {
    const headerRows: string[][] = [["ENSEMBLE", "DATE", vectorName, "ERROR", "LABEL"]];
    const dataRows: (string | number)[][] = [];

    for (const entry of entries) {
        for (const obs of entry.data.observations) {
            dataRows.push([entry.ensembleDisplayName, obs.date, obs.value, obs.error, obs.label]);
        }
    }

    return { headerRows, dataRows };
}
