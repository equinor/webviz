import React from "react";

// import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";

import type { ViewContext } from "@framework/ModuleContext";
import { useWebWorkerProxy } from "@lib/hooks/useWebWorker";
import { createZipFilename, downloadZip } from "@lib/utils/downloadUtils";
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

// const {hook} = makeAWorkerHook(CsvAssemblyWorker, api);

export function useDownloadData(viewContext: ViewContext<Interfaces>): { assembleCsvAndDownload: () => void } {
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
    // const csvAssemblyWorker = useWebWorkerProxy(api, CsvAssemblyWorker);

    // const assembleCsvFilesResult = useQuery({
    //     queryKey: ["test", visualizationMode, statisticsSelection, showHistorical, showObservations],
    //     queryFn: async () =>
    //         csvAssemblyWorker.assembleCsvFiles(
    //             visualizationMode,
    //             realizationData,
    //             statisticsData,
    //             historicalData,
    //             observationData,
    //             statisticsSelection,
    //             showHistorical,
    //             showObservations,
    //         ),
    //     staleTime: Infinity,
    // });

    const assembleCsvAndDownload = React.useCallback(
        async function assembleCsvAndDownload() {
            try {
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
                    vectorName: entry.vectorSpecification.vectorName,
                    data: entry.data,
                }));

                const observationData = loadedObservationData.map((entry) => ({
                    vectorName: entry.vectorSpecification.vectorName,
                    data: entry.data,
                }));

                // Assemble csv files in web worker to avoid blocking the main thread.
                const files = await csvAssemblyWorker.assembleCsvFiles(
                    visualizationMode,
                    realizationData,
                    statisticsData,
                    historicalData,
                    observationData,
                    statisticsSelection,
                    showHistorical,
                    showObservations,
                );

                if (files.length === 0) {
                    return;
                }

                const zipFilename = createZipFilename("SimulationTimeSeries");

                await downloadZip(
                    files.map((f: { filename: string; csvContent: string }) => ({
                        filename: f.filename,
                        content: f.csvContent,
                    })),
                    zipFilename,
                );
            } catch (error) {
                console.error("Error assembling or downloading CSV files:", error);
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
