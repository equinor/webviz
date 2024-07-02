/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InplaceVolumetricsIndexNames } from './InplaceVolumetricsIndexNames';
/**
 * Unique values for an index column in a volumetric table
 * All values should ideally be strings, but it is commmon to see integers, especially for REGION
 */
export type InplaceVolumetricsIndex = {
    index_name: InplaceVolumetricsIndexNames;
    values: Array<(string | number)>;
};

