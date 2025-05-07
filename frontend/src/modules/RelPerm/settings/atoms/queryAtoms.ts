import { getRelpermTableInfo, getRelpermTableNames } from "@api";
import { atomWithQueries } from "@framework/utils/atomUtils";

import { selectedEnsembleIdentsAtom, selectedRelPermTableNameAtom } from "./derivedAtoms";

export const relPermTableNamesQueriesAtom = atomWithQueries((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const queries = selectedEnsembleIdents.map((ensembleIdent) => {
        return () => ({
            queryKey: ["getRelpermTableNames", ensembleIdent.getCaseUuid(), ensembleIdent.getEnsembleName()],
            queryFn: async () => {
                const { data } = await getRelpermTableNames({
                    query: {
                        case_uuid: ensembleIdent.getCaseUuid(),
                        ensemble_name: ensembleIdent.getEnsembleName(),
                    },
                    throwOnError: true,
                });

                return data;
            },
        });
    });
    return { queries };
});

export const relPermTableInfoQueriesAtom = atomWithQueries((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const selectedTableName = get(selectedRelPermTableNameAtom);
    const queries = selectedEnsembleIdents.map((ensembleIdent) => {
        return () => ({
            queryKey: [
                "getRelpermTableInfo",
                ensembleIdent.getCaseUuid(),
                ensembleIdent.getEnsembleName(),
                selectedTableName,
            ],
            queryFn: async () => {
                const { data } = await getRelpermTableInfo({
                    query: {
                        case_uuid: ensembleIdent.getCaseUuid(),
                        ensemble_name: ensembleIdent.getEnsembleName(),
                        table_name: selectedTableName || "",
                    },
                    throwOnError: true,
                });

                return data;
            },
        });
    });
    return { queries };
});
