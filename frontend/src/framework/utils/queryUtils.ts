import { EnsembleFingerprintStore } from "@framework/EnsembleFingerprintStore";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { calcFnv1aHash } from "@lib/utils/hashUtils";

export function makeCacheBustingQueryParam(...ensembleIdents: (RegularEnsembleIdent | null)[]): {
    zCacheBust?: string;
} {
    // If no ensembles are provided, return an empty object
    if (ensembleIdents.length === 0) {
        return {};
    }

    // Filter out null or undefined idents
    const filteredEnsembleIdents = ensembleIdents.filter((ident) => ident !== null && ident !== undefined);

    // Get the ensemble fingerprints from the EnsembleFingerprintsStore
    const ensembleFingerprints = EnsembleFingerprintStore.getFingerprints(...filteredEnsembleIdents);

    // Make concatenated 64bit hash of all fingerprints
    ensembleFingerprints.sort();
    const hash = calcFnv1aHash(ensembleFingerprints.join(""));

    // Return the fingerprint query param
    return { zCacheBust: hash };
}
