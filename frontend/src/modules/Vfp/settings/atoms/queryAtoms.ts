import { getVfpTableNamesOptions, getVfpTableOptions } from "@api";

import { atomWithQuery } from "jotai-tanstack-query";

import { selectedEnsembleIdentAtom, selectedRealizationNumberAtom, selectedVfpTableNameAtom } from "./derivedAtoms";

export const vfpTableQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);
    const selectedRealizationNumber = get(selectedRealizationNumberAtom);
    const selectedVfpTableName = get(selectedVfpTableNameAtom);

    const query = {
        ...getVfpTableOptions({
            query: {
                case_uuid: selectedEnsembleIdent?.getCaseUuid() ?? "",
                ensemble_name: selectedEnsembleIdent?.getEnsembleName() ?? "",
                realization: selectedRealizationNumber ?? 0,
                vfp_table_name: selectedVfpTableName ?? "",
            },
        }),
        enabled: Boolean(
            selectedEnsembleIdent?.getCaseUuid() &&
                selectedEnsembleIdent?.getEnsembleName() &&
                selectedRealizationNumber !== null &&
                selectedVfpTableName,
        ),
    };
    return query;
});

export const vfpTableNamesQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);
    const selectedRealizationNumber = get(selectedRealizationNumberAtom);

    const query = {
        ...getVfpTableNamesOptions({
            query: {
                case_uuid: selectedEnsembleIdent?.getCaseUuid() ?? "",
                ensemble_name: selectedEnsembleIdent?.getEnsembleName() ?? "",
                realization: selectedRealizationNumber ?? 0,
            },
        }),
        enabled: Boolean(
            selectedEnsembleIdent?.getCaseUuid() &&
                selectedEnsembleIdent?.getEnsembleName() &&
                selectedRealizationNumber !== null,
        ),
    };
    return query;
});
