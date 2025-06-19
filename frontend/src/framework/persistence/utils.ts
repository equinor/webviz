export function objectToJsonString(obj: unknown): string {
    try {
        return JSON.stringify(obj, null, 2);
    } catch (error) {
        console.error("Failed to convert object to JSON string:", error);
        return "";
    }
}

export async function hashJsonString(jsonString: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(jsonString);

    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
}
