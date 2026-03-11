import {
    StatisticFunction_api,
    type SummaryVectorObservations_api,
    type VectorHistoricalData_api,
    type VectorRealizationData_api,
    type VectorStatisticData_api,
} from "@api";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { convertRowsToCsvContentString, type CsvFile, type CsvRows } from "@lib/utils/csvConvertUtils";
import type { StatisticsSelection } from "@modules/SimulationTimeSeries/typesAndEnums";
import {
    FanchartStatisticOption,
    StatisticFunctionEnumToStringMapping,
    VisualizationMode,
} from "@modules/SimulationTimeSeries/typesAndEnums";

// Vector data per ensemble
type PerEnsembleVectorData<T> = {
    ensembleDisplayName: string;
    data: T;
};

// Vector name and its data, categorized per ensemble
export type VectorEnsemblesData<T> = {
    vectorName: string;
    perEnsembleData: PerEnsembleVectorData<T>[];
};

function sanitizeFilename(name: string): string {
    return name.replace(/[:/\\]/g, "_");
}

function assembleCsvFilesPerVector<T>(
    inputData: VectorEnsemblesData<T>[],
    filenameSuffix: string,
    buildCsvRows: (vectorName: string, perEnsembleData: PerEnsembleVectorData<T>[]) => CsvRows,
): CsvFile[] {
    const files: CsvFile[] = [];
    for (const { vectorName, perEnsembleData } of inputData) {
        const csvRows = buildCsvRows(vectorName, perEnsembleData);
        const filename = `${sanitizeFilename(vectorName)}_${filenameSuffix}.csv`;
        files.push({ filename, csvContent: convertRowsToCsvContentString(csvRows) });
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
    realizationData: VectorEnsemblesData<VectorRealizationData_api[]>[],
): CsvFile[] {
    return assembleCsvFilesPerVector(realizationData, "realizations", buildRealizationCsvRows);
}

function buildRealizationCsvRows(
    vectorName: string,
    perEnsembleData: PerEnsembleVectorData<VectorRealizationData_api[]>[],
): CsvRows {
    const headerRows: string[][] = [["ENSEMBLE", "DATE", "REAL", vectorName]];
    const dataRows: (string | number)[][] = [];

    for (const vecEnsData of perEnsembleData) {
        for (const realization of vecEnsData.data) {
            for (let i = 0; i < realization.timestampsUtcMs.length; i++) {
                dataRows.push([
                    vecEnsData.ensembleDisplayName,
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
    statisticsData: VectorEnsemblesData<VectorStatisticData_api>[],
    statisticFunctions: StatisticFunction_api[],
): CsvFile[] {
    if (statisticFunctions.length === 0) return [];

    // Use arrow function for calling buildStatisticsCsvRows to capture statisticFunctions
    return assembleCsvFilesPerVector(statisticsData, "statistics", (vectorName, perEnsembleData) =>
        buildStatisticsCsvRows(vectorName, perEnsembleData, statisticFunctions),
    );
}

function buildStatisticsCsvRows(
    vectorName: string,
    perEnsembleData: PerEnsembleVectorData<VectorStatisticData_api>[],
    statisticFunctions: StatisticFunction_api[],
): CsvRows {
    const headerRows: string[][] = [
        ["ENSEMBLE", "DATE", ...statisticFunctions.map(() => vectorName)],
        ["", "", ...statisticFunctions.map((fn) => StatisticFunctionEnumToStringMapping[fn])],
    ];
    const dataRows: (string | number)[][] = [];

    for (const vecEnsData of perEnsembleData) {
        const statValueMap = new Map<StatisticFunction_api, number[]>();
        for (const vo of vecEnsData.data.valueObjects) {
            if (statisticFunctions.includes(vo.statisticFunction)) {
                statValueMap.set(vo.statisticFunction, vo.values);
            }
        }

        for (let i = 0; i < vecEnsData.data.timestampsUtcMs.length; i++) {
            const row: (string | number)[] = [
                vecEnsData.ensembleDisplayName,
                timestampUtcMsToCompactIsoString(vecEnsData.data.timestampsUtcMs[i]),
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

export function assembleHistoricalCsvFiles(historicalData: VectorEnsemblesData<VectorHistoricalData_api>[]): CsvFile[] {
    return assembleCsvFilesPerVector(historicalData, "historical", buildHistoricalCsvRows);
}

function buildHistoricalCsvRows(
    vectorName: string,
    perEnsembleData: PerEnsembleVectorData<VectorHistoricalData_api>[],
): CsvRows {
    const headerRows: string[][] = [["ENSEMBLE", "DATE", vectorName]];
    const dataRows: (string | number)[][] = [];

    for (const vecEnsData of perEnsembleData) {
        for (let i = 0; i < vecEnsData.data.timestampsUtcMs.length; i++) {
            dataRows.push([
                vecEnsData.ensembleDisplayName,
                timestampUtcMsToCompactIsoString(vecEnsData.data.timestampsUtcMs[i]),
                vecEnsData.data.values[i],
            ]);
        }
    }

    return { headerRows, dataRows };
}

export function assembleObservationCsvFiles(
    observationData: VectorEnsemblesData<SummaryVectorObservations_api>[],
): CsvFile[] {
    return assembleCsvFilesPerVector(observationData, "observations", buildObservationCsvRows);
}

function buildObservationCsvRows(
    vectorName: string,
    perEnsembleData: PerEnsembleVectorData<SummaryVectorObservations_api>[],
): CsvRows {
    const headerRows: string[][] = [["ENSEMBLE", "DATE", vectorName, "ERROR", "LABEL"]];
    const dataRows: (string | number)[][] = [];

    for (const vecEnsData of perEnsembleData) {
        for (const obs of vecEnsData.data.observations) {
            dataRows.push([vecEnsData.ensembleDisplayName, obs.date, obs.value, obs.error, obs.label]);
        }
    }

    return { headerRows, dataRows };
}
