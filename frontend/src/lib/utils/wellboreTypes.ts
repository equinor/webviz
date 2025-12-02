import type { WellboreHeader_api } from "@api";

/**
 * Simplified wellbore header type that reduces data complexity by summarizing
 * perforations and screens into a simple string array instead of detailed nested objects.
 */
export interface SimplifiedWellboreHeader {
    wellboreUuid: string;
    uniqueWellboreIdentifier: string;
    wellUuid: string;
    uniqueWellIdentifier: string;
    wellEasting: number;
    wellNorthing: number;
    depthReferencePoint: string;
    depthReferenceElevation: number;
    wellborePurpose: string;
    wellboreStatus: string;

    /**
     * Array containing unique perforation completion modes and "Screen" if screens exist.
     * This replaces the complex nested perforations and screens arrays with a simple summary.
     */
    perforationAndScreens: string[];
}

/**
 * Transforms an WellboreHeader_api to a SimplifiedWellboreHeader by:
 * 1. Extracting unique perforation completion modes
 * 2. Adding "Screen" if any screens exist
 * 3. Copying all other properties as-is
 */
export function transformToSimplifiedWellboreHeader(enhanced: WellboreHeader_api): SimplifiedWellboreHeader {
    const perforationAndScreens: string[] = [];

    // Extract unique perforation completion modes
    if (enhanced.perforations && enhanced.perforations.length > 0) {
        const uniqueCompletionModes = new Set(enhanced.perforations.map((perf) => perf.completionMode));
        perforationAndScreens.push(...Array.from(uniqueCompletionModes));
    }

    // Add "Screen" if any screens exist
    if (enhanced.screens && enhanced.screens.length > 0) {
        perforationAndScreens.push("Screen");
    }

    return {
        wellboreUuid: enhanced.wellboreUuid,
        uniqueWellboreIdentifier: enhanced.uniqueWellboreIdentifier,
        wellUuid: enhanced.wellUuid,
        uniqueWellIdentifier: enhanced.uniqueWellIdentifier,
        wellEasting: enhanced.wellEasting,
        wellNorthing: enhanced.wellNorthing,
        depthReferencePoint: enhanced.depthReferencePoint,
        depthReferenceElevation: enhanced.depthReferenceElevation,
        wellborePurpose: enhanced.wellborePurpose,
        wellboreStatus: enhanced.wellboreStatus,
        perforationAndScreens,
    };
}

/**
 * Transforms an array of WellboreHeader_api to SimplifiedWellboreHeader array
 */
export function transformToSimplifiedWellboreHeaders(
    enhancedHeaders: WellboreHeader_api[],
): SimplifiedWellboreHeader[] {
    return enhancedHeaders.map(transformToSimplifiedWellboreHeader);
}

/**
 * Helper function to convert SimplifiedWellboreHeader back to the essential properties
 * needed for data provider queries (just the UUID and identifier)
 */
export function extractWellboreIdentifiers(
    simplified: SimplifiedWellboreHeader[],
): Pick<WellboreHeader_api, "wellboreUuid" | "uniqueWellboreIdentifier">[] {
    return simplified.map((header) => ({
        wellboreUuid: header.wellboreUuid,
        uniqueWellboreIdentifier: header.uniqueWellboreIdentifier,
    }));
}
