import { EnsembleFingerprintsStore } from "@framework/EnsembleFingerprintsStore";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export function makeTimestampQueryParam(...ensembleIdents: RegularEnsembleIdent[]): { t?: number } {
    // If no ensembles are provided, return an empty object
    if (ensembleIdents.length === 0) {
        return {};
    }

    // Get the ensemble fingerprints from the EnsembleFingerprintsStore
    const ensembleFingerprints = EnsembleFingerprintsStore.getFingerprints(...ensembleIdents);

    // Make concatenated 64bit hash of all fingerprints
    const hash = hashStringTo64BitInt(ensembleFingerprints.join(""));

    // Return the maximum timestamp as a query parameter
    return { t: hash };
}

const FNV64_OFFSET = 0xcbf29ce484222325n; // 14695981039346656037
const FNV64_PRIME = 0x00000100000001b3n; // 1099511628211
const U64_MASK = 0xffffffffffffffffn;

export function hashStringTo64BitInt(str: string): number {
    const bytes = new TextEncoder().encode(str);

    let h = FNV64_OFFSET;

    for (let i = 0; i < bytes.length; i++) {
        h ^= BigInt(bytes[i]);
        h = (h * FNV64_PRIME) & U64_MASK; // wrap to 64 bits
    }

    return Number(h);
}
