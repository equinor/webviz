/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InplaceVolumetricsCategoryValues } from './InplaceVolumetricsCategoryValues';
/**
 * Volumetric data for a given table, volumetric response and category/index filter
 */
export type InplaceVolumetricData = {
    vol_table_name: string;
    result_name: string;
    result_per_realization: Array<any[]>;
    categories: Array<InplaceVolumetricsCategoryValues>;
};

