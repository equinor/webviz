import React from "react";

import { useAtomValue } from "jotai";
import { toast } from "react-toastify";

import type { ViewContext } from "@framework/ModuleContext";
import { useWebWorkerProxy } from "@lib/hooks/useWebWorker";
import { createZipFilename, downloadFilesZip } from "@lib/utils/downloadUtils";
import type { Interfaces } from "@modules/SimulationTimeSeries/interfaces";

import { showHistoricalAtom, showObservationsAtom, visualizationModeAtom } from "../../view/atoms/baseAtoms";
import {
    loadedRegularEnsembleVectorSpecificationsAndHistoricalDataAtom,
    loadedVectorSpecificationsAndObservationDataAtom,
    loadedVectorSpecificationsAndRealizationDataAtom,
    loadedVectorSpecificationsAndStatisticsDataAtom,
} from "../atoms/derivedAtoms";
import { type CsvAssemblyWorkerApi } from "../utils/CsvAssemblyWorker/csvAssembly.worker";
import CsvAssemblyWorker from "../utils/CsvAssemblyWorker/csvAssembly.worker?worker";

import { useMakeEnsembleDisplayNameFunc } from "./useMakeEnsembleDisplayNameFunc";

export function useDownloadData(viewContext: ViewContext<Interfaces>): {
    assembleCsvAndDownload: () => void;
} {
    const statisticsSelection = viewContext.useSettingsToViewInterfaceValue("statisticsSelection");
    const visualizationMode = useAtomValue(visualizationModeAtom);
    const showHistorical = useAtomValue(showHistoricalAtom);
    const showObservations = useAtomValue(showObservationsAtom);

    const loadedRealizationData = useAtomValue(loadedVectorSpecificationsAndRealizationDataAtom);
    const loadedStatisticsData = useAtomValue(loadedVectorSpecificationsAndStatisticsDataAtom);
    const loadedHistoricalData = useAtomValue(loadedRegularEnsembleVectorSpecificationsAndHistoricalDataAtom);
    const loadedObservationData = useAtomValue(loadedVectorSpecificationsAndObservationDataAtom);

    const makeEnsembleDisplayName = useMakeEnsembleDisplayNameFunc(viewContext);

    const csvAssemblyWorker = useWebWorkerProxy<CsvAssemblyWorkerApi>(CsvAssemblyWorker);

    const assembleCsvAndDownload = React.useCallback(
        async function assembleCsvAndDownload() {
            const zipFilename = createZipFilename("SimulationTimeSeries");
            const toastId = toast.loading(`Preparing Simulation Time Series Download`, {
                autoClose: false,
                closeButton: true,
            });

            try {
                // Map data before sending to worker, as the worker cannot receive functions (like makeEnsembleDisplayName)
                const realizationData = loadedRealizationData.map((entry) => ({
                    ensembleDisplayName: makeEnsembleDisplayName(entry.vectorSpecification.ensembleIdent),
                    vectorName: entry.vectorSpecification.vectorName,
                    data: entry.data,
                }));

                const statisticsData = loadedStatisticsData.map((entry) => ({
                    ensembleDisplayName: makeEnsembleDisplayName(entry.vectorSpecification.ensembleIdent),
                    vectorName: entry.vectorSpecification.vectorName,
                    data: entry.data,
                }));

                const historicalData = loadedHistoricalData.map((entry) => ({
                    ensembleDisplayName: makeEnsembleDisplayName(entry.vectorSpecification.ensembleIdent),
                    vectorName: entry.vectorSpecification.vectorName,
                    data: entry.data,
                }));

                const observationData = loadedObservationData.map((entry) => ({
                    ensembleDisplayName: makeEnsembleDisplayName(entry.vectorSpecification.ensembleIdent),
                    vectorName: entry.vectorSpecification.vectorName,
                    data: entry.data,
                }));

                // Assemble csv files in web worker to avoid blocking the main thread.
                const files = await csvAssemblyWorker.assembleCsvFiles(
                    realizationData,
                    statisticsData,
                    historicalData,
                    observationData,
                    visualizationMode,
                    statisticsSelection,
                    showHistorical,
                    showObservations,
                );

                if (files.length > 0) {
                    await downloadFilesZip(
                        files.map((e) => ({ filename: e.filename, content: e.csvContent })),
                        zipFilename,
                    );
                }

                toast.update(toastId, { render: zipFilename, type: "success", isLoading: false, autoClose: 3000 });
            } catch (error) {
                console.error("Error assembling or downloading CSV files:", error);
                toast.update(toastId, {
                    render: `Failed Simulation Time Series Download`,
                    type: "error",
                    isLoading: false,
                    autoClose: 5000,
                });
            }
        },
        [
            csvAssemblyWorker,
            loadedHistoricalData,
            loadedObservationData,
            loadedRealizationData,
            loadedStatisticsData,
            showHistorical,
            showObservations,
            statisticsSelection,
            visualizationMode,
            makeEnsembleDisplayName,
        ],
    );

    return { assembleCsvAndDownload };
}
