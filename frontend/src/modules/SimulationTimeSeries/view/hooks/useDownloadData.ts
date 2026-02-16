import React from "react";

import { useAtomValue } from "jotai";

import { createZipFilename, downloadZip } from "@lib/utils/downloadUtils";
import { CsvAssemblerService } from "@modules/_shared/csvAssemblerService";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";

import {
    csvDownloadRequestCounterAtom,
    showHistoricalAtom,
    showObservationsAtom,
    statisticsSelectionAtom,
    visualizationModeAtom,
} from "../../settings/atoms/baseAtoms";
import { selectedDeltaEnsemblesAtom, selectedRegularEnsemblesAtom } from "../../settings/atoms/derivedAtoms";
import {
    loadedRegularEnsembleVectorSpecificationsAndHistoricalDataAtom,
    loadedVectorSpecificationsAndObservationDataAtom,
    loadedVectorSpecificationsAndRealizationDataAtom,
    loadedVectorSpecificationsAndStatisticsDataAtom,
} from "../atoms/derivedAtoms";

export function useDownloadData(): void {
    const csvDownloadRequestCounter = useAtomValue(csvDownloadRequestCounterAtom);

    const visualizationMode = useAtomValue(visualizationModeAtom);
    const statisticsSelection = useAtomValue(statisticsSelectionAtom);
    const showHistorical = useAtomValue(showHistoricalAtom);
    const showObservations = useAtomValue(showObservationsAtom);

    const selectedRegularEnsembles = useAtomValue(selectedRegularEnsemblesAtom);
    const selectedDeltaEnsembles = useAtomValue(selectedDeltaEnsemblesAtom);

    const loadedRealizationData = useAtomValue(loadedVectorSpecificationsAndRealizationDataAtom);
    const loadedStatisticsData = useAtomValue(loadedVectorSpecificationsAndStatisticsDataAtom);
    const loadedHistoricalData = useAtomValue(loadedRegularEnsembleVectorSpecificationsAndHistoricalDataAtom);
    const loadedObservationData = useAtomValue(loadedVectorSpecificationsAndObservationDataAtom);

    const prevCounterRef = React.useRef(csvDownloadRequestCounter);
    const csvAssemblerServiceRef = React.useRef(new CsvAssemblerService());

    React.useEffect(() => {
        const service = csvAssemblerServiceRef.current;
        return () => service.terminate();
    }, []);

    React.useEffect(
        function assembleCsvAndDownload() {
            if (csvDownloadRequestCounter === prevCounterRef.current) {
                return;
            }
            prevCounterRef.current = csvDownloadRequestCounter;

            let cancelled = false;

            async function run() {
                try {
                    const startTime = performance.now();

                    const allSelectedEnsembles = [...selectedRegularEnsembles, ...selectedDeltaEnsembles];

                    const realizationData = loadedRealizationData.map((entry) => ({
                        ensembleDisplayName: makeDistinguishableEnsembleDisplayName(
                            entry.vectorSpecification.ensembleIdent,
                            allSelectedEnsembles,
                        ),
                        vectorName: entry.vectorSpecification.vectorName,
                        data: entry.data,
                    }));

                    const statisticsData = loadedStatisticsData.map((entry) => ({
                        ensembleDisplayName: makeDistinguishableEnsembleDisplayName(
                            entry.vectorSpecification.ensembleIdent,
                            allSelectedEnsembles,
                        ),
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

                    const files = await csvAssemblerServiceRef.current.api.assembleSimulationTimeSeriesCsv(
                        visualizationMode,
                        realizationData,
                        statisticsData,
                        historicalData,
                        observationData,
                        statisticsSelection,
                        showHistorical,
                        showObservations,
                    );

                    if (cancelled || files.length === 0) {
                        return;
                    }

                    const now = new Date();
                    const timestamp = now.toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "_");
                    const zipFilename = `SimulationTimeSeries_${timestamp}.zip`;
                    const zipFilename = createZipFilename("SimulationTimeSeries");

                    const endTime = performance.now();
                    // TODO: remove
                    console.log(`Assembling CSV files took ${endTime - startTime} milliseconds.`);

                    const downloadStartTime = performance.now();
                    await downloadZip(
                        files.map((f: { filename: string; csvContent: string }) => ({
                            filename: f.filename,
                            content: f.csvContent,
                        })),
                        zipFilename,
                    );
                    const downloadEndTime = performance.now();

                    // TODO: remove
                    console.log(`Downloading ZIP file took ${downloadEndTime - downloadStartTime} milliseconds.`);
                } catch (error) {
                    console.error("Error assembling or downloading CSV files:", error);
                }
            }

            // Run async function without awaiting it, since we don't want to block the effect cleanup
            // while the CSV is being assembled and downloaded. The cleanup will set `cancelled` to true,
            // which the async function can check to abort if needed.
            run();

            return () => {
                cancelled = true;
            };
        },
        // Only trigger on counter change — the other values are captured from the current render's closure.
        // Intentionally excluding data deps so that changing settings mid-download doesn't cancel it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [csvDownloadRequestCounter],
    );
}
