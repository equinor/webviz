/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BoundingBox2d } from './BoundingBox2d';
import type { SurfaceDef } from './SurfaceDef';
export type SurfaceDataPng = {
    format: any;
    surface_def: SurfaceDef;
    transformed_bbox_utm: BoundingBox2d;
    value_min: number;
    value_max: number;
    png_image_base64: string;
};

