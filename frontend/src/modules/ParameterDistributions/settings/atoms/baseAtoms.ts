import type { ParameterIdent } from "@framework/EnsembleParameters";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithCompare } from "@framework/utils/atomUtils";
import { areEnsembleIdentListsEqual, areEnsembleIdentsEqual } from "@framework/utils/ensembleIdentUtils";
import {
    EnsembleMode,
    ParameterDistributionPlotType,
    ParameterDistributionSortingMethod,
} from "@modules/ParameterDistributions/typesAndEnums";
import { atom } from "jotai";

export const userSelectedEnsembleModeAtom = atom<EnsembleMode>(EnsembleMode.INDEPENDENT);
export const userSelectedParameterSortingMethodAtom = atom<ParameterDistributionSortingMethod>(
    ParameterDistributionSortingMethod.ALPHABETICAL,
);
export const selectedVisualizationTypeAtom = atom<ParameterDistributionPlotType>(
    ParameterDistributionPlotType.HISTOGRAM,
);
export const showIndividualRealizationValuesAtom = atom<boolean>(false);
export const showPercentilesAndMeanLinesAtom = atom<boolean>(false);

export const userSelectedEnsembleIdentsAtom = atomWithCompare<RegularEnsembleIdent[]>([], areEnsembleIdentListsEqual);
export const userSelectedParameterIdentsAtom = atom<ParameterIdent[] | null>(null);
export const showConstantParametersAtom = atom<boolean>(false);
export const userSelectedPriorEnsembleIdentAtom = atomWithCompare<RegularEnsembleIdent | null>(
    null,
    areEnsembleIdentsEqual,
);

export const userSelectedPosteriorEnsembleIdentAtom = atomWithCompare<RegularEnsembleIdent | null>(
    null,
    areEnsembleIdentsEqual,
);
