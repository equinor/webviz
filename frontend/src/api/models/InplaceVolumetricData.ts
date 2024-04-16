/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InplaceVolumetricDataEntry } from './InplaceVolumetricDataEntry';
export type InplaceVolumetricData = {
    vol_table_name: string;
    result_name: string;
    entries: Array<InplaceVolumetricDataEntry>;
    primary_group_by: (string | null);
    secondary_group_by: (string | null);
};

