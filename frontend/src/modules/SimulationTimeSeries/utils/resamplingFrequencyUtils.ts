import type { Frequency_api } from "@api";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";

import { VisualizationMode } from "../typesAndEnums";

/**
 * Statistical visualization modes require defined resample frequency, i.e.
 * can not calculate statistics on raw data.
 */
export function isInvalidStatisticsResampleFrequency(
    resampleFrequency: Frequency_api | null,
    visualizationMode: VisualizationMode,
) {
    return (
        resampleFrequency === null &&
        [
            VisualizationMode.STATISTICAL_FANCHART,
            VisualizationMode.STATISTICAL_LINES,
            VisualizationMode.STATISTICS_AND_REALIZATIONS,
        ].includes(visualizationMode)
    );
}

/**
 * Function to get warning string for the resample frequency setting
 *
 * Returns warning if:
 * - Resample frequency is RAW (null) and visualization mode requires resampling
 * - Resample frequency is RAW (null) and delta ensembles are selected
 */
export function makeResampleFrequencyWarningString(
    resampleFrequency: Frequency_api | null,
    visualizationMode: VisualizationMode,
    selectedEnsembleIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[] | null,
): string | undefined {
    const isInvalidStatisticsResampleFreq = isInvalidStatisticsResampleFrequency(resampleFrequency, visualizationMode);
    const isInvalidDeltaEnsemblaResampleFreq =
        resampleFrequency === null &&
        selectedEnsembleIdents &&
        selectedEnsembleIdents.some((ident) => isEnsembleIdentOfType(ident, DeltaEnsembleIdent));

    if (isInvalidStatisticsResampleFreq && isInvalidDeltaEnsemblaResampleFreq) {
        return "Statistical visualization and delta ensembles requires resampled data (not Raw).";
    }
    if (isInvalidStatisticsResampleFreq) {
        return "Statistical visualization requires resampled data (not Raw).";
    }
    if (isInvalidDeltaEnsemblaResampleFreq) {
        return "Delta ensembles requires resampled data (not Raw).";
    }
    return undefined;
}
