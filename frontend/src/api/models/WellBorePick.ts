/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

/**
 * Wellbore pick from SMDA
 *
 * Camel case attributes needed for esvIntersection component in front-end
 */
export type WellBorePick = {
    northing: number;
    easting: number;
    tvd: number;
    tvdMsl: number;
    md: number;
    mdMsl: number;
    uniqueWellboreIdentifier: string;
    pickIdentifier: string;
    confidence: (string | null);
    depthReferencePoint: string;
    mdUnit: string;
};

