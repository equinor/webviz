import { EnsembleFingerprintStore } from "@framework/EnsembleFingerprintStore";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { calcFnv1aHash } from "@lib/utils/hashUtils";

export function makeCacheBustingQueryParam(...ensembleIdents: (RegularEnsembleIdent | null)[]): {
    zCacheBust?: string;
} {
    // If no ensembles are provided, return an empty object
    if (ensembleIdents.length === 0) {
        throw new Error("makeCacheBustingQueryParam requires at least one ensemble ident");
    }

    // Get the ensemble fingerprints from the EnsembleFingerprintsStore
    const ensembleFingerprints: string[] = [];
    for (const ident of ensembleIdents) {
        if (!ident) {
            return {
                zCacheBust: "INVALID_CACHE_BUSTING_PARAM_NO_ENSEMBLE",
            };
        }
        const fingerprint = EnsembleFingerprintStore.getFingerprintFromEnsembleIdentString(ident.toString());
        if (!fingerprint) {
            // Why are we failing hard here? Hitting a cache miss is not a big issue, but hitting cached data that
            // we actually don't want to hit is a big issue. By throwing an error here, we ensure that we never
            // serve cached data for an ensemble that has no known fingerprint, which might be wrong data.
            throw new Error(`Missing fingerprint for ensemble ident: ${ident}`);
        }
        ensembleFingerprints.push(fingerprint);
    }

    // Make concatenated 64bit hash of all fingerprints
    ensembleFingerprints.sort();
    const hash = calcFnv1aHash(ensembleFingerprints.join(""));

    // Return the fingerprint query param
    return { zCacheBust: hash };
}
