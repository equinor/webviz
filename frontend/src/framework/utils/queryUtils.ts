import { EnsembleFingerprintStore } from "@framework/EnsembleFingerprintStore";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { calcFnv1aHash } from "@lib/utils/hashUtils";

export function makeFingerprintQueryParam(...ensembleIdents: RegularEnsembleIdent[]): { zCacheBust?: string } {
    // If no ensembles are provided, return an empty object
    if (ensembleIdents.length === 0) {
        return {};
    }

    // Get the ensemble fingerprints from the EnsembleFingerprintsStore
    const ensembleFingerprints = EnsembleFingerprintStore.getFingerprints(...ensembleIdents);

    // Make concatenated 64bit hash of all fingerprints
    ensembleFingerprints.sort();
    const hash = calcFnv1aHash(ensembleFingerprints.join(""));

    // Return the fingerprint query param
    return { zCacheBust: hash };
}
