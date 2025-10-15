import type { QueryClient } from "@tanstack/react-query";

import { type EnsembleIdent_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { postRefreshFingerprintsForEnsemblesOptions } from "@api";

export type EnsembleFingerprintItem = {
    ensembleIdent: RegularEnsembleIdent;
    fingerprint: string | null;
};

export async function fetchLatestEnsembleFingerprints(
    queryClient: QueryClient,
    ensembleIdents: RegularEnsembleIdent[],
): Promise<EnsembleFingerprintItem[]> {
    const idents = ensembleIdents.map<EnsembleIdent_api>((ens) => ({
        caseUuid: ens.getCaseUuid(),
        ensembleName: ens.getEnsembleName(),
    }));

    const fingerprints = await queryClient.fetchQuery({
        ...postRefreshFingerprintsForEnsemblesOptions({ body: idents }),
        staleTime: 0,
        gcTime: 0,
    });

    return ensembleIdents.map((ident, i) => ({
        ensembleIdent: ident,
        fingerprint: fingerprints[i],
    }));
}
