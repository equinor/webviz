/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RepeatedTableColumnData } from './RepeatedTableColumnData';
import type { TableColumnData } from './TableColumnData';
/**
 * Volumetric data for a single table
 *
 * Contains data for a single fluid zone, e.g. Oil, Gas, Water, or sum of fluid zones
 */
export type InplaceVolumetricTableData = {
    fluidSelectionName: string;
    selectorColumns: Array<RepeatedTableColumnData>;
    resultColumns: Array<TableColumnData>;
};

