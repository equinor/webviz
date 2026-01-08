/**
 * Sorts object keys recursively to ensure deterministic JSON output
 */
function sortKeysRecursively(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(sortKeysRecursively);
    }

    if (typeof obj === 'object') {
        const sorted: Record<string, unknown> = {};
        const keys = Object.keys(obj).sort();
        for (const key of keys) {
            sorted[key] = sortKeysRecursively((obj as Record<string, unknown>)[key]);
        }
        return sorted;
    }

    return obj;
}

export function objectToJsonString(obj: unknown): string {
    try {
        // Sort keys recursively to ensure deterministic output
        const sorted = sortKeysRecursively(obj);
        return JSON.stringify(sorted, null, 2);
    } catch (error) {
        console.error("Failed to convert object to JSON string. Offending object:", obj, "Error:", error);
        throw error;
    }
}

/*
This function computes a SHA-256 hash of the given string and returns it as a hex string.
NOTE: This function needs to be in sync with the backend implementation to ensure consistent hashing.
*/
export async function hashSessionContentString(string: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(string);

    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
}
