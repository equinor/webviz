export function objectToJsonString(obj: unknown): string {
    try {
        return JSON.stringify(obj, null, 2);
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
