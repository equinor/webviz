import { strToU8, zip } from "fflate";

type StringFile = { filename: string; content: string };
type BinaryFile = { filename: string; content: Uint8Array };
type DownloadFile = StringFile | BinaryFile;

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
 * Create a zip Blob from an array of named files.
 * Uses fflate's async zip() which offloads compression to Web Workers internally.
 */
export async function createZipBlobAsync(files: DownloadFile[]): Promise<Blob> {
    const zipInput: Record<string, Uint8Array> = {};
    for (const file of files) {
        zipInput[file.filename] = typeof file.content === "string" ? strToU8(file.content) : file.content;
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
 * Create a zip from named files and trigger a browser download.
 * Zip compression runs off the main thread via fflate's built-in async workers.
 */
export async function downloadFilesZip(files: DownloadFile[], zipFilename: string): Promise<void> {
    const blob = await createZipBlobAsync(files);
    downloadBlobFile(blob, zipFilename);
}

/**
 * Generate a timestamped filename for a zip file, using the provided base name and current date/time.
 * Format: `${baseName}_YYYYMMDD_HHMMSS.zip`
 * Example: `MyBaseName_20240615_143025.zip`
 */
export function createZipFilename(baseName: string): string {
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "_");
    return `${baseName}_${timestamp}.zip`;
}
