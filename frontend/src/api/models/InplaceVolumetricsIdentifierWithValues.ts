/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InplaceVolumetricsIdentifier } from './InplaceVolumetricsIdentifier';
/**
 * Unique values for an index column in a volumetric table
 * All values should ideally be strings, but it is common to see integers, especially for REGION
 */
export type InplaceVolumetricsIdentifierWithValues = {
    identifier: InplaceVolumetricsIdentifier;
    values: Array<(string | number)>;
};

