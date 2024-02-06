/**
 * Types for ESV Intersection component, as they are noe exported
 *
 * Version: "@equinor/esv-intersection@3.0.12"
 *
 *
 */

/**
 * Pick type from esv-intersection version 3.0.12
 *
 * Compare this snippet from node_modules/@equinor/esv-intersection/src/datautils/picks.ts/Pick
 */
export type Pick = {
    pickIdentifier?: string;
    confidence: string | null;
    depthReferencePoint: string;
    md: number;
    mdUnit: string;
    tvd: number;
};

/**
 * Unit type from esv-intersection version 3.0.12
 *
 * Compare this snippet from node_modules/@equinor/esv-intersection/src/datautils/picks.ts/Unit
 */
export type Unit = {
    identifier: string;
    top: string;
    base: string;
    baseAge: number;
    topAge: number;
    colorR: number;
    colorG: number;
    colorB: number;
    stratUnitLevel: number;
    lithologyType: number;
    stratUnitParent: number;
};
