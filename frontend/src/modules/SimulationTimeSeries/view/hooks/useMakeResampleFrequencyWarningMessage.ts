import { useAtomValue } from "jotai";

import { makeResampleFrequencyWarningString } from "@modules/SimulationTimeSeries/utils/resamplingFrequencyUtils";

import { resampleFrequencyAtom, visualizationModeAtom } from "../atoms/baseAtoms";

export function useMakeResampleFrequencyWarningMessage(): string | null {
    const resampleFrequency = useAtomValue(resampleFrequencyAtom);
    const visualizationMode = useAtomValue(visualizationModeAtom);

    // Make warning message without passing selected ensembles
    // - Check for invalid resampling frequency for delta ensembles handled by status writer
    return makeResampleFrequencyWarningString(resampleFrequency, visualizationMode) ?? null;
}
