import { ParameterIdent } from "@framework/EnsembleParameters";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithCompare } from "@framework/utils/atomUtils";
import { ParameterDistributionPlotType } from "@modules/ParameterDistributionMatrix/typesAndEnums";

import { atom } from "jotai";

function areEnsembleIdentListsEqual(a: RegularEnsembleIdent[], b: RegularEnsembleIdent[]) {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (!a[i].equals(b[i])) {
            return false;
        }
    }
    return true;
}

export const selectedVisualizationTypeAtom = atom<ParameterDistributionPlotType>(
    ParameterDistributionPlotType.DISTRIBUTION_PLOT
);
export const showIndividualRealizationValuesAtom = atom<boolean>(false);
export const showPercentilesAndMeanLinesAtom = atom<boolean>(false);

export const userSelectedEnsembleIdentsAtom = atomWithCompare<RegularEnsembleIdent[]>([], areEnsembleIdentListsEqual);
export const userSelectedParameterIdentsAtom = atom<ParameterIdent[]>([]);
export const showConstantParametersAtom = atom<boolean>(false);
