/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Grid3dBoundingBox } from './Grid3dBoundingBox';
import type { Grid3dDimensions } from './Grid3dDimensions';
import type { Grid3dPropertyInfo } from './Grid3dPropertyInfo';
/**
 * Metadata for a 3D grid model, including its properties and geometry
 */
export type Grid3dInfo = {
    grid_name: string;
    bbox: Grid3dBoundingBox;
    dimensions: Grid3dDimensions;
    property_info_arr: Array<Grid3dPropertyInfo>;
};

