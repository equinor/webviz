import type {
    SummaryVectorObservations_api,
    VectorHistoricalData_api,
    VectorRealizationData_api,
    VectorStatisticData_api,
} from "@api";
import { exposeWorkerApi } from "@lib/hooks/useWebWorker";
import type { CsvFile } from "@lib/utils/csvConvertUtils";

import { VisualizationMode } from "../../../typesAndEnums";
import type { StatisticsSelection } from "../../../typesAndEnums";

import {
    assembleHistoricalCsvFiles,
    assembleObservationCsvFiles,
    assembleRealizationCsvFiles,
    assembleStatisticsCsvFiles,
    getSelectedStatisticFunctions,
} from "./_utils";

export async function assembleCsvFiles(
    visualizationMode: VisualizationMode,
    realizationData: { ensembleDisplayName: string; vectorName: string; data: VectorRealizationData_api[] }[],
    statisticsData: { ensembleDisplayName: string; vectorName: string; data: VectorStatisticData_api }[],
    historicalData: { vectorName: string; data: VectorHistoricalData_api }[],
    observationData: { vectorName: string; data: SummaryVectorObservations_api }[],
    statisticsSelection: StatisticsSelection,
    showHistorical: boolean,
    showObservations: boolean,
): Promise<CsvFile[]> {
    const files: CsvFile[] = [];

    // Add sleep to emulate even longer processing time for large datasets, to better test the loading state in the UI
    await new Promise((resolve) => setTimeout(resolve, 3000));

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

const workerApi = { assembleCsvFiles };
exposeWorkerApi(workerApi);
export type CsvAssemblyWorkerApi = typeof workerApi;
