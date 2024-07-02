/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FluidZone } from './FluidZone';
import type { InplaceVolumetricsIndex } from './InplaceVolumetricsIndex';
/**
 * Definition of a volumetric table
 */
export type InplaceVolumetricsTableDefinition = {
    table_name: string;
    fluid_zones: Array<FluidZone>;
    result_names: Array<string>;
    indexes: Array<InplaceVolumetricsIndex>;
};

