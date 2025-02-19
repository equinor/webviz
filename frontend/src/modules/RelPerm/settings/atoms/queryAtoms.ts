import { getRelpermTableInfoOptions, getRelpermTableNamesOptions } from "@api";

import { atomWithQuery } from "jotai-tanstack-query";

import { selectedEnsembleIdentAtom, selectedRelPermTableNameAtom } from "./derivedAtoms";

export const relPermTableNamesQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);
    const query = {
        ...getRelpermTableNamesOptions({
            query: {
                case_uuid: selectedEnsembleIdent?.getCaseUuid() ?? "",
                ensemble_name: selectedEnsembleIdent?.getEnsembleName() ?? "",
            },
        }),
        enabled: Boolean(selectedEnsembleIdent?.getCaseUuid() && selectedEnsembleIdent?.getEnsembleName()),
    };
    return query;
});

export const relPermTableInfoQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);
    const selectedTableName = get(selectedRelPermTableNameAtom);
    const query = {
        ...getRelpermTableInfoOptions({
            query: {
                case_uuid: selectedEnsembleIdent?.getCaseUuid() ?? "",
                ensemble_name: selectedEnsembleIdent?.getEnsembleName() ?? "",
                table_name: selectedTableName ?? "",
            },
        }),
        enabled: Boolean(
            selectedEnsembleIdent?.getCaseUuid() && selectedEnsembleIdent?.getEnsembleName() && selectedTableName
        ),
    };
    return query;
});
