/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { B64FloatArray } from './B64FloatArray';
import type { BoundingBox2d } from './BoundingBox2d';
import type { SurfaceDef } from './SurfaceDef';
export type SurfaceDataFloat = {
    format: any;
    surface_def: SurfaceDef;
    transformed_bbox_utm: BoundingBox2d;
    value_min: number;
    value_max: number;
    values_b64arr: B64FloatArray;
};

