import type { QueryClient } from "@tanstack/react-query";

import { postGetTimestampsForEnsemblesOptions, type EnsembleIdent_api, type EnsembleTimestamps_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { postRefreshFingerprintsForEnsemblesOptions } from "@api";

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

    const fingerprints = await queryClient.fetchQuery({
        ...postRefreshFingerprintsForEnsemblesOptions({ body: idents }),
        staleTime: 0,
        gcTime: 0,
    });

    console.log("Fetched ensemble fingerprints:", { fingerprints });

    return ensembleIdents.map((ident, i) => ({
        ensembleIdent: ident,
        timestamps: timestamps[i],
    }));
}
