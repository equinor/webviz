/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FluidZone } from './FluidZone';
import type { InplaceVolumetricResultName } from './InplaceVolumetricResultName';
import type { InplaceVolumetricsIdentifierWithValues } from './InplaceVolumetricsIdentifierWithValues';
/**
 * Definition of a volumetric table
 */
export type InplaceVolumetricsTableDefinition = {
    tableName: string;
    fluidZones: Array<FluidZone>;
    resultNames: Array<InplaceVolumetricResultName>;
    identifiersWithValues: Array<InplaceVolumetricsIdentifierWithValues>;
};

