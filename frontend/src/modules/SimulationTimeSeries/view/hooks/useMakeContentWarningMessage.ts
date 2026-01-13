import { useAtomValue } from "jotai";

import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { makeResampleFrequencyWarningString } from "@modules/SimulationTimeSeries/utils/resamplingFrequencyUtils";

import { resampleFrequencyAtom, vectorSpecificationsAtom, visualizationModeAtom } from "../atoms/baseAtoms";

export function useResampleFrequencyWarningMessage(): string | null {
    const resampleFrequency = useAtomValue(resampleFrequencyAtom);
    const visualizationMode = useAtomValue(visualizationModeAtom);
    const vectorSpecifications = useAtomValue(vectorSpecificationsAtom);

    const selectedEnsembleIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[] = [];
    for (const vecSpec of vectorSpecifications) {
        if (selectedEnsembleIdents.some((elm) => elm.equals(vecSpec.ensembleIdent))) {
            continue;
        }
        selectedEnsembleIdents.push(vecSpec.ensembleIdent);
    }

    return makeResampleFrequencyWarningString(resampleFrequency, visualizationMode, selectedEnsembleIdents) ?? null;
}
