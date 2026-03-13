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
import { toVectorEnsemblesDataArray } from "../utils/CsvAssemblyWorker/mappers";

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
            const toastId = toast.loading(`Preparing Simulation Time Series Download`, {
                autoClose: false,
                closeButton: true,
            });

            try {
                // Map data before sending to worker, as the worker cannot receive functions (like makeEnsembleDisplayName)
                const realizationData = toVectorEnsemblesDataArray(loadedRealizationData, makeEnsembleDisplayName);
                const statisticsData = toVectorEnsemblesDataArray(loadedStatisticsData, makeEnsembleDisplayName);
                const historicalData = toVectorEnsemblesDataArray(loadedHistoricalData, makeEnsembleDisplayName);
                const observationData = toVectorEnsemblesDataArray(loadedObservationData, makeEnsembleDisplayName);

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

                if (files.length === 0) {
                    toast.update(toastId, {
                        render: `No data available for download`,
                        type: "info",
                        isLoading: false,
                        autoClose: 3000,
                    });
                    return;
                }

                const zipFilename = createZipFilename("SimulationTimeSeries");
                await downloadFilesZip(
                    files.map((e) => ({ filename: e.filename, content: e.csvContent })),
                    zipFilename,
                );

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
