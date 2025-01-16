import { getDrilledWellboreHeadersOptions, getGridModelsInfoOptions } from "@api";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";

import { atomWithQuery } from "jotai-tanstack-query";

import { selectedEnsembleIdentAtom, selectedRealizationAtom } from "./derivedAtoms";

export const gridModelInfosQueryAtom = atomWithQuery((get) => {
    const ensembleIdent = get(selectedEnsembleIdentAtom);
    const realizationNumber = get(selectedRealizationAtom);

    const caseUuid = ensembleIdent?.getCaseUuid() ?? "";
    const ensembleName = ensembleIdent?.getEnsembleName() ?? "";

    return {
        ...getGridModelsInfoOptions({
            query: {
                case_uuid: caseUuid,
                ensemble_name: ensembleName,
                realization_num: realizationNumber ?? 0,
            },
        }),
        enabled: Boolean(caseUuid && ensembleName && realizationNumber !== null),
    };
});

export const drilledWellboreHeadersQueryAtom = atomWithQuery((get) => {
    const ensembleIdent = get(selectedEnsembleIdentAtom);
    const ensembleSet = get(EnsembleSetAtom);

    let fieldIdentifier: string | null = null;
    if (ensembleIdent) {
        const ensemble = ensembleSet.findEnsemble(ensembleIdent);
        if (ensemble) {
            fieldIdentifier = ensemble.getFieldIdentifier();
        }
    }

    return {
        ...getDrilledWellboreHeadersOptions({
            query: {
                field_identifier: fieldIdentifier ?? "",
            },
        }),
        enabled: Boolean(fieldIdentifier),
    };
});
