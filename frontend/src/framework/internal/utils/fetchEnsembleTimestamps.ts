import type { QueryClient } from "@tanstack/react-query";

import { postGetTimestampsForEnsemblesOptions, type EnsembleIdent_api, type EnsembleTimestamps_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export type EnsembleTimestampsItem = {
    ensembleIdent: RegularEnsembleIdent;
    timestamps: EnsembleTimestamps_api;
};

export async function fetchLatestEnsembleTimestamps(
    queryClient: QueryClient,
    ensembleIdents: RegularEnsembleIdent[],
): Promise<EnsembleTimestampsItem[]> {
    const idents = ensembleIdents.map<EnsembleIdent_api>((ens) => ({
        caseUuid: ens.getCaseUuid(),
        ensembleName: ens.getEnsembleName(),
    }));

    const timestamps = await queryClient.fetchQuery({
        ...postGetTimestampsForEnsemblesOptions({ body: idents }),
        staleTime: 0,
        gcTime: 0,
    });

    return ensembleIdents.map((ident, i) => ({
        ensembleIdent: ident,
        timestamps: timestamps[i],
    }));
}
