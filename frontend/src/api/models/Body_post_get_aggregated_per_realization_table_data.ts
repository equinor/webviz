/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InplaceVolumetricsIdentifier } from './InplaceVolumetricsIdentifier';
import type { InplaceVolumetricsIdentifierWithValues } from './InplaceVolumetricsIdentifierWithValues';
export type Body_post_get_aggregated_per_realization_table_data = {
    /**
     * The identifiers to group table data by
     */
    group_by_identifiers: Array<InplaceVolumetricsIdentifier>;
    /**
     * Selected identifiers and wanted values
     */
    identifiers_with_values: Array<InplaceVolumetricsIdentifierWithValues>;
};

