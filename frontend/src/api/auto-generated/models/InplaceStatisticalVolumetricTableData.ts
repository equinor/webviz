/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RepeatedTableColumnData } from './RepeatedTableColumnData';
import type { TableColumnStatisticalData } from './TableColumnStatisticalData';
/**
 * Statistical volumetric data for single volume table
 *
 * Contains data for a single fluid zone, e.g. Oil, Gas, Water, or sum of fluid zones
 */
export type InplaceStatisticalVolumetricTableData = {
    fluidSelectionName: string;
    selectorColumns: Array<RepeatedTableColumnData>;
    resultColumnStatistics: Array<TableColumnStatisticalData>;
};

