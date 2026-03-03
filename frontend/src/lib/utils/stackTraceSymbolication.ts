/**
 * Utility for symbolicating minified error stack traces using source maps.
 *
 * This module provides functionality to convert minified production error stacks
 * back to readable source locations by fetching and parsing source maps.
 */

import ErrorStackParser from "error-stack-parser";
import { SourceMapConsumer } from "source-map-js";
import type { RawSourceMap } from "source-map-js";

// Cache for loaded source maps to avoid redundant fetches
const sourceMapCache = new Map<string, Promise<SourceMapConsumer | null>>();

/**
 * Fetches a source map file from the server
 */
async function fetchSourceMap(sourceMapUrl: string): Promise<SourceMapConsumer | null> {
    try {
        const response = await fetch(sourceMapUrl, {
            credentials: "same-origin",
        });

        if (!response.ok) {
            console.warn(`Failed to fetch source map: ${sourceMapUrl} (${response.status})`);
            return null;
        }

        const sourceMapData: RawSourceMap = await response.json();
        return new SourceMapConsumer(sourceMapData);
    } catch (error) {
        console.warn(`Error fetching source map ${sourceMapUrl}:`, error);
        return null;
    }
}

/**
 * Extracts the source map URL from a JavaScript file URL
 * Assumes Vite's convention: filename.js -> filename.js.map
 */
function getSourceMapUrl(jsFileUrl: string): string {
    // Remove any query parameters or hash
    const cleanUrl = jsFileUrl.split("?")[0].split("#")[0];
    return `${cleanUrl}.map`;
}

/**
 * Gets a source map from cache or fetches it
 */
async function getSourceMap(fileName: string): Promise<SourceMapConsumer | null> {
    const sourceMapUrl = getSourceMapUrl(fileName);

    if (!sourceMapCache.has(sourceMapUrl)) {
        sourceMapCache.set(sourceMapUrl, fetchSourceMap(sourceMapUrl));
    }

    return sourceMapCache.get(sourceMapUrl)!;
}

/**
 * Symbolicates a complete error stack trace.
 *
 * @param error - The Error object with stack trace
 * @param onProgress - Optional callback to report progress (0-1)
 * @returns Promise resolving to symbolicated stack trace string
 */
export async function symbolicateStackTrace(error: Error, onProgress?: (progress: number) => void): Promise<string> {
    try {
        if (!error.stack) {
            return error.toString();
        }

        // In development, return original stack (already readable)
        if (import.meta.env.DEV) {
            return error.stack;
        }

        // Parse the stack trace using error-stack-parser
        const frames = ErrorStackParser.parse(error);
        const symbolicatedLines: string[] = [error.toString()];

        for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];

            if (!frame.fileName || typeof frame.lineNumber !== "number" || typeof frame.columnNumber !== "number") {
                // Can't symbolicate without location info
                symbolicatedLines.push(`    at ${frame.functionName || "unknown"}`);
                continue;
            }

            // Only try to symbolicate bundled files (skip external URLs, node_modules, etc.)
            const isLocalFile = frame.fileName.startsWith(window.location.origin) || !frame.fileName.startsWith("http");

            if (!isLocalFile) {
                symbolicatedLines.push(
                    `    at ${frame.functionName || "unknown"} (${frame.fileName}:${frame.lineNumber}:${frame.columnNumber})`,
                );
                continue;
            }

            try {
                const sourceMap = await getSourceMap(frame.fileName);

                if (sourceMap) {
                    const original = sourceMap.originalPositionFor({
                        line: frame.lineNumber,
                        column: frame.columnNumber,
                    });

                    if (original.source && original.line) {
                        // Successfully symbolicated
                        const cleanSource = original.source
                            .replace(/^webpack:\/\/\//, "")
                            .replace(/^\//, "")
                            .replace(/^\.\//, "");
                        const name = original.name || frame.functionName || "unknown";

                        symbolicatedLines.push(
                            `    at ${name} (${cleanSource}:${original.line}:${original.column ?? 0})`,
                        );
                    } else {
                        // Source map exists but couldn't resolve position
                        symbolicatedLines.push(
                            `    at ${frame.functionName || "unknown"} (${frame.fileName}:${frame.lineNumber}:${frame.columnNumber})`,
                        );
                    }
                } else {
                    // No source map available, use original minified location
                    symbolicatedLines.push(
                        `    at ${frame.functionName || "unknown"} (${frame.fileName}:${frame.lineNumber}:${frame.columnNumber})`,
                    );
                }
            } catch (err) {
                console.warn("Error symbolicating frame:", err);
                // On error, include original minified frame
                symbolicatedLines.push(
                    `    at ${frame.functionName || "unknown"} (${frame.fileName}:${frame.lineNumber}:${frame.columnNumber})`,
                );
            }

            if (onProgress) {
                onProgress((i + 1) / frames.length);
            }
        }

        return symbolicatedLines.join("\n");
    } catch (err) {
        console.error("Failed to symbolicate stack trace:", err);
        // Return original stack on error
        return error.stack || error.toString();
    }
}

/**
 * Symbolicates a stack trace string (alternative API)
 *
 * @param stackString - The stack trace as a string
 * @param onProgress - Optional callback to report progress (0-1)
 * @returns Promise resolving to symbolicated stack trace string
 */
export async function symbolicateStackString(
    stackString: string,
    onProgress?: (progress: number) => void,
): Promise<string> {
    // Create a temporary error object to parse
    const tempError = new Error();
    tempError.stack = stackString;

    return symbolicateStackTrace(tempError, onProgress);
}

/**
 * Checks if symbolication should be attempted
 */
export function shouldSymbolicate(): boolean {
    // Don't symbolicate in development (already readable)
    if (import.meta.env.DEV) {
        return false;
    }

    // Don't attempt if we can't fetch (e.g., file:// protocol)
    if (!window.fetch) {
        return false;
    }

    return true;
}

/**
 * Clears the source map cache
 */
export function clearSourceMapCache(): void {
    sourceMapCache.clear();
}
