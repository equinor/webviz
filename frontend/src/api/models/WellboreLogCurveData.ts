/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type WellboreLogCurveData = {
    name: string;
    logName: string;
    indexMin: number;
    indexMax: number;
    minCurveValue: (number | null);
    maxCurveValue: (number | null);
    curveAlias: (string | null);
    curveDescription: (string | null);
    indexUnit: string;
    noDataValue: (number | null);
    unit: string;
    curveUnitDesc: (string | null);
    dataPoints: Array<Array<(number | string | null)>>;
    metadataDiscrete: (Record<string, any[]> | null);
};

