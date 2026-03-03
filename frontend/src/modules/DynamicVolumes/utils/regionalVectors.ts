/**
 * Utilities for parsing Eclipse/OPM regional summary vector names.
 *
 * Regional vectors follow the naming convention:
 *   VECTORBASE:REGION        for FIPNUM  (e.g. "ROIP:1")
 *   VECTORBASE_XXX:REGION    for custom FIP arrays (e.g. "ROIP_PLT:3" → FIPPLT)
 *
 * Matched families:
 *   R[OGW]IP*       – regional in-place volumes
 *   R[OGW][IP][RT]* – regional injection/production rates & cumulatives
 */

export type RegionalVectorInfo = {
    /** Base vector name without FIP suffix or region, e.g. "ROIP", "ROIT" */
    baseName: string;
    /** FIP array identifier, e.g. "FIPNUM" or "FIPPLT" */
    fipArray: string;
    /** Region number */
    region: number;
};

export type RegionalVectorsInfo = {
    /** Sorted list of unique base vector names */
    vectorNames: string[];
    /** Map from FIP array identifier to sorted list of available region numbers */
    fipArrays: Record<string, number[]>;
};

/**
 * Regex matching regional volume vectors.
 *
 * Group 1: vector base name (e.g. ROIP, RGIP, RWIP, ROIT, ROPT, RGIT, …)
 * Group 2: optional FIP array suffix without leading underscore (e.g. PLT for FIPPLT)
 * Group 3: region number
 */
const REGIONAL_VECTOR_RE = /^(R[OGW](?:IP[A-Z]*|[IP][RT][A-Z]*))(?:_([A-Z]+))?:([0-9]+)$/;

/**
 * Parse a single regional summary vector name.
 *
 * @returns Parsed info or `null` if the vector doesn't match any regional pattern.
 *
 * @example
 *   parseRegionalVector("ROIP:3")       // { baseName: "ROIP", fipArray: "FIPNUM", region: 3 }
 *   parseRegionalVector("ROIT_PLT:12")  // { baseName: "ROIT", fipArray: "FIPPLT", region: 12 }
 *   parseRegionalVector("FOPT")         // null
 */
export function parseRegionalVector(vectorName: string): RegionalVectorInfo | null {
    const m = vectorName.match(REGIONAL_VECTOR_RE);
    if (!m) return null;

    const [, baseName, fipSuffix, regionStr] = m;
    return {
        baseName,
        fipArray: fipSuffix ? `FIP${fipSuffix}` : "FIPNUM",
        region: Number(regionStr),
    };
}

/**
 * Extract regional vector metadata from a list of vector descriptions
 * (as returned by the `get_vector_list` endpoint).
 *
 * Filters the vector list to only regional volume vectors and returns
 * the unique base names and available FIP arrays with their region numbers.
 *
 * @example
 *   const vectors = [{ name: "ROIP:1" }, { name: "ROIP:2" }, { name: "RGIP:1" }, { name: "FOPT" }];
 *   const info = extractRegionalVectorsInfo(vectors.map(v => v.name));
 *   // info.vectorNames === ["RGIP", "ROIP"]
 *   // info.fipArrays === { FIPNUM: [1, 2] }
 */
export function extractRegionalVectorsInfo(vectorNames: string[]): RegionalVectorsInfo {
    const vectorBases = new Set<string>();
    const fipArrays = new Map<string, Set<number>>();

    for (const name of vectorNames) {
        const parsed = parseRegionalVector(name);
        if (!parsed) continue;

        vectorBases.add(parsed.baseName);

        let regions = fipArrays.get(parsed.fipArray);
        if (!regions) {
            regions = new Set();
            fipArrays.set(parsed.fipArray, regions);
        }
        regions.add(parsed.region);
    }

    // Sort everything for stable output
    const sortedFipArrays: Record<string, number[]> = {};
    for (const fip of [...fipArrays.keys()].sort()) {
        sortedFipArrays[fip] = [...fipArrays.get(fip)!].sort((a, b) => a - b);
    }

    return {
        vectorNames: [...vectorBases].sort(),
        fipArrays: sortedFipArrays,
    };
}
