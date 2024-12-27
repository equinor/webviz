/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Data for a single column in a volumetric table
 *
 * Length of index list should be equal to the number of rows in the table
 *
 * - unique_values: List of unique values in the column
 * - indices: List of indices, in unique_values list, for each row in the table
 */
export type RepeatedTableColumnData = {
    columnName: string;
    uniqueValues: Array<(string | number)>;
    indices: Array<number>;
};

