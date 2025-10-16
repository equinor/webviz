import type { QueryClient } from "@tanstack/react-query";

import { type EnsembleIdent_api } from "@api";
import { postRefreshFingerprintsForEnsemblesOptions } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

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

    try {
        const fingerprints = await queryClient.fetchQuery({
            ...postRefreshFingerprintsForEnsemblesOptions({ body: idents }),
            staleTime: 0,
            gcTime: 0,
        });

        return ensembleIdents.map((ident, i) => ({
            ensembleIdent: ident,
            fingerprint: fingerprints[i],
        }));
    } catch (error) {
        console.error("Error fetching latest ensemble fingerprints:", error);
        return [];
    }
}
