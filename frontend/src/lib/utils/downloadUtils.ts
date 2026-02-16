import { strToU8, zip } from "fflate";

/**
 * Trigger a browser file download from a Blob.
 * Creates a temporary object URL, clicks a hidden anchor element, and cleans up.
 */
export function downloadBlobFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Trigger a browser file download from a string content.
 */
export function downloadTextFile(content: string, filename: string, mimeType: string = "text/csv"): void {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    downloadBlobFile(blob, filename);
}

/**
 * Create a zip Blob from an array of named string files.
 * Uses fflate's async zip() which offloads compression to Web Workers internally.
 */
export function createZipBlobAsync(files: { filename: string; content: string }[]): Promise<Blob> {
    const zipInput: Record<string, Uint8Array> = {};
    for (const file of files) {
        zipInput[file.filename] = strToU8(file.content);
    }

    return new Promise<Blob>((resolve, reject) => {
        zip(zipInput, (err, data) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(new Blob([data as Uint8Array<ArrayBuffer>], { type: "application/zip" }));
        });
    });
}

/**
 * Create a zip from named string files and trigger a browser download.
 * Zip compression runs off the main thread via fflate's built-in async workers.
 */
export async function downloadZip(files: { filename: string; content: string }[], zipFilename: string): Promise<void> {
    const blob = await createZipBlobAsync(files);
    downloadBlobFile(blob, zipFilename);
}
