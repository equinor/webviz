import React from "react";

import { useAtomValue } from "jotai";

import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { downloadZip } from "@lib/utils/downloadUtil";
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
import { assembleCsvFiles } from "../utils/csvDataAssembler";

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

    React.useEffect(
        function triggerDownload() {
            if (csvDownloadRequestCounter === prevCounterRef.current) {
                return;
            }
            prevCounterRef.current = csvDownloadRequestCounter;

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

            const files = assembleCsvFiles(
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

            const now = new Date();
            const timestamp = now.toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "_");
            const zipFilename = `SimulationTimeSeries_${timestamp}.zip`;

            downloadZip(
                files.map((f) => ({ filename: f.filename, content: f.csvContent })),
                zipFilename,
            );
        },
        [
            csvDownloadRequestCounter,
            visualizationMode,
            statisticsSelection,
            showHistorical,
            showObservations,
            selectedRegularEnsembles,
            selectedDeltaEnsembles,
            loadedRealizationData,
            loadedStatisticsData,
            loadedHistoricalData,
            loadedObservationData,
        ],
    );
}
