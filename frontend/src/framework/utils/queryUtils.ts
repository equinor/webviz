import { EnsembleFingerprintsStore } from "@framework/EnsembleFingerprintsStore";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export function makeFingerprintQueryParam(...ensembleIdents: RegularEnsembleIdent[]): { f?: string } {
    // If no ensembles are provided, return an empty object
    if (ensembleIdents.length === 0) {
        return {};
    }

    // Get the ensemble fingerprints from the EnsembleFingerprintsStore
    const ensembleFingerprints = EnsembleFingerprintsStore.getFingerprints(...ensembleIdents);

    // Make concatenated 64bit hash of all fingerprints
    const hash = hashStringTo64BitInt(ensembleFingerprints.join(""));

    // Return the maximum timestamp as a query parameter
    return { f: hash };
}

const FNV64_OFFSET_BASIS = 0xcbf29ce484222325n; // 14695981039346656037
const FNV64_PRIME_MULTIPLIER = 0x00000100000001b3n; // 1099511628211
const U64_MASK = 0xffffffffffffffffn;

/**
 * Hash a string to a 64-bit integer using a 64-bit FNV-1a hash.
 * @param str The string to hash.
 * @returns The 64-bit hash of the string.
 */
export function hashStringTo64BitInt(str: string): string {
    // Encode string as UTF-8
    const bytes = new TextEncoder().encode(str);

    let hash = FNV64_OFFSET_BASIS;

    // Loop over bytes
    for (let i = 0; i < bytes.length; i++) {
        // XOR the hash with the current byte
        hash ^= BigInt(bytes[i]);
        // Multiply the hash by the FNV prime and wrap to 64 bits
        hash = (hash * FNV64_PRIME_MULTIPLIER) & U64_MASK;
    }

    // Format as zero-padded 16-hex-digit string
    const hex = hash.toString(16).padStart(16, "0");
    return hex;
}
