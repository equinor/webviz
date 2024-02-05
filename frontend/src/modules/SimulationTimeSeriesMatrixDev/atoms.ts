import { Frequency_api } from "@api";
import { apiService } from "@framework/ApiService";
import { atomWithCompare, atomWithQueries } from "@framework/AtomStoreMaster";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { Parameter, ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { fixupEnsembleIdents } from "@framework/utils/ensembleUiHelpers";

import { atom } from "jotai";
import { atomWithQuery } from "jotai-tanstack-query";
import { isEqual } from "lodash";

import { GroupBy, VisualizationMode } from "./state";

export const resampleFrequencyAtom = atom<Frequency_api | null>(null);

export const groupByAtom = atom<GroupBy>(GroupBy.TIME_SERIES);

export const colorRealizationsByParameterAtom = atom<boolean>(false);

export const visualizationModeAtom = atom<VisualizationMode>(VisualizationMode.STATISTICAL_FANCHART);

export const showHistoricalAtom = atom<boolean>(true);

export const showObservationsAtom = atom<boolean>(true);

export const userSelectedEnsembleIdentsAtom = atomWithCompare<EnsembleIdent[]>([], isEqual);

export const selectedEnsembleIdentsAtom = atom<EnsembleIdent[]>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const selectedEnsembleIdents = get(userSelectedEnsembleIdentsAtom);

    const newSelectedEnsembleIdents = selectedEnsembleIdents.filter((ensemble) => ensembleSet.hasEnsemble(ensemble));

    const validatedEnsembleIdents = fixupEnsembleIdents(newSelectedEnsembleIdents, ensembleSet);

    return validatedEnsembleIdents ?? [];
});

export const continuousAndNonConstantParametersUnionAtom = atom<Parameter[]>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);

    const continuousAndNonConstantParametersUnion: Parameter[] = [];

    for (const ensembleIdent of selectedEnsembleIdents) {
        const ensemble = ensembleSet.findEnsemble(ensembleIdent);

        if (!ensemble) {
            continue;
        }

        const continuousAndNonConstantParameters = ensemble
            .getParameters()
            .getParameterArr()
            .filter((parameter) => parameter.type === ParameterType.CONTINUOUS && !parameter.isConstant);

        // Add non-duplicate parameters to list - verified by ParameterIdent
        for (const parameter of continuousAndNonConstantParameters) {
            const parameterIdent = ParameterIdent.fromNameAndGroup(parameter.name, parameter.groupName);
            const isParameterInUnion = continuousAndNonConstantParametersUnion.some((elm) =>
                parameterIdent.equals(ParameterIdent.fromNameAndGroup(elm.name, elm.groupName))
            );

            if (isParameterInUnion) continue;
            continuousAndNonConstantParametersUnion.push(parameter);
        }
    }

    return continuousAndNonConstantParametersUnion;
});

export const vectorListQueriesAtom = atomWithQueries((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);

    const queries = selectedEnsembleIdents.map((ensembleIdent) => {
        return {
            queryKey: ["ensembles", ensembleIdent.toString()],
            queryFn: () =>
                apiService.timeseries.getVectorList(ensembleIdent.getCaseUuid(), ensembleIdent.getEnsembleName()),
        };
    });

    return {
        queries,
    };
});
