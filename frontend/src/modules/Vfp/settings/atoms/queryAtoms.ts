import { atomWithQuery } from "jotai-tanstack-query";

import { getVfpTableOptions, getVfpTablesOptions, VfpType_api } from "@api";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

import {
    selectedEnsembleIdentAtom,
    effectiveRealizationNumberAtom,
    selectedVfpTableNumberAtom,
    selectedVfpTypeAtom,
} from "./persistableFixableAtoms";

export const vfpTableQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);
    const effectiveRealizationNumber = get(effectiveRealizationNumberAtom);
    const selectedVfpType = get(selectedVfpTypeAtom);
    const selectedVfpTableNumber = get(selectedVfpTableNumberAtom);

    const ensembleIdent = selectedEnsembleIdent.value;
    const realizationNumber = effectiveRealizationNumber.value;
    const vfpType = selectedVfpType.value;
    const vfpTableNumber = selectedVfpTableNumber.value;

    const query = {
        ...getVfpTableOptions({
            query: {
                case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                realization: realizationNumber ?? 0,
                vfp_type: vfpType ?? VfpType_api.PROD,
                vfp_table_number: vfpTableNumber ?? 0,
                ...makeCacheBustingQueryParam(ensembleIdent),
            },
        }),
        enabled: Boolean(
            ensembleIdent?.getCaseUuid() &&
                ensembleIdent?.getEnsembleName() &&
                selectedEnsembleIdent.isValidInContext &&
                effectiveRealizationNumber.isValidInContext &&
                realizationNumber !== null &&
                selectedVfpType.isValidInContext &&
                vfpType !== null &&
                selectedVfpTableNumber.isValidInContext &&
                vfpTableNumber !== null,
        ),
    };
    return query;
});

export const vfpTablesQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);
    const effectiveRealizationNumber = get(effectiveRealizationNumberAtom);

    const ensembleIdent = selectedEnsembleIdent.value;
    const realizationNumber = effectiveRealizationNumber.value;

    const query = {
        ...getVfpTablesOptions({
            query: {
                case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                realization: realizationNumber ?? 0,
                ...makeCacheBustingQueryParam(ensembleIdent),
            },
        }),
        // Persisted/template values are returned unchanged even when invalid, so gate on isValidInContext.
        enabled: Boolean(
            ensembleIdent?.getCaseUuid() &&
                ensembleIdent?.getEnsembleName() &&
                selectedEnsembleIdent.isValidInContext &&
                effectiveRealizationNumber.isValidInContext &&
                realizationNumber !== null,
        ),
    };
    return query;
});
