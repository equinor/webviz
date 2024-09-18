/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InplaceVolumetricTableData } from './InplaceVolumetricTableData';
/**
 * Volumetric data for a single table per fluid selection
 *
 * Fluid selection can be single fluid zones, e.g. Oil, Gas, Water, or sum of fluid zones - Oil + Gas + Water
 */
export type InplaceVolumetricTableDataPerFluidSelection = {
    tableDataPerFluidSelection: Array<InplaceVolumetricTableData>;
};

