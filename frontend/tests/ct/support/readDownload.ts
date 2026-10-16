import type { Download } from "@playwright/test";

export async function readDownloadAsString(download: Download): Promise<string> {
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks).toString("utf-8");
}
