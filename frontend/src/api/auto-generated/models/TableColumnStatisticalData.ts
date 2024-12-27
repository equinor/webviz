/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Statistical data for a single result column in a volumetric table
 *
 * Length of column values should be equal to the number of rows in the table
 */
export type TableColumnStatisticalData = {
    columnName: string;
    statisticValues: Record<string, Array<number>>;
};

