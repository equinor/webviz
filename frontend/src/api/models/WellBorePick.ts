/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

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

